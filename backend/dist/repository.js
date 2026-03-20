import { pool } from "./db.js";
export class PostgresRepository {
    async createIncident(payload) {
        const client = await pool.connect();
        try {
            await client.query("begin");
            const deviceId = await this.ensureDevice(client, payload.deviceId);
            const incidentResult = await client.query(`
        insert into incidents (device_id, status)
        values ($1, 'triggered')
        returning id, status, created_at, updated_at
      `, [deviceId]);
            const incident = incidentResult.rows[0];
            await client.query(`
        insert into incident_events (incident_id, event_type, source_timestamp, signature)
        values ($1, $2, $3, $4)
      `, [incident.id, payload.eventType, payload.timestamp, payload.signature]);
            await client.query(`
        insert into audit_logs (actor, action, incident_id, metadata)
        values ($1, $2, $3, $4)
      `, [
                "device",
                "incident.triggered",
                incident.id,
                {
                    signature: payload.signature,
                    sourceTimestamp: payload.timestamp,
                    batteryLevel: payload.batteryLevel,
                    gps: payload.gps,
                    externalDeviceId: payload.deviceId
                }
            ]);
            await client.query("commit");
            return {
                id: incident.id,
                status: incident.status,
                createdAt: toIso(incident.created_at),
                updatedAt: toIso(incident.updated_at),
                deviceId: payload.deviceId,
                latestGps: payload.gps,
                batteryLevel: payload.batteryLevel,
                eventType: payload.eventType
            };
        }
        catch (error) {
            await client.query("rollback");
            throw error;
        }
        finally {
            client.release();
        }
    }
    async listIncidents() {
        const result = await pool.query(`
      select
        i.id,
        i.status,
        i.created_at,
        i.updated_at,
        d.external_device_id,
        coalesce((a.metadata->>'batteryLevel')::int, 0) as battery_level,
        coalesce((a.metadata->'gps'->>'lat')::double precision, 0) as lat,
        coalesce((a.metadata->'gps'->>'lon')::double precision, 0) as lon,
        coalesce(e.event_type, 'long_press') as event_type
      from incidents i
      join devices d on d.id = i.device_id
      left join lateral (
        select metadata
        from audit_logs
        where incident_id = i.id and action = 'incident.triggered'
        order by created_at desc
        limit 1
      ) a on true
      left join lateral (
        select event_type
        from incident_events
        where incident_id = i.id
        order by created_at desc
        limit 1
      ) e on true
      order by i.created_at desc
    `);
        return result.rows.map((row) => this.toIncident(row));
    }
    async getIncident(id) {
        const result = await pool.query(`
      select
        i.id,
        i.status,
        i.created_at,
        i.updated_at,
        d.external_device_id,
        coalesce((a.metadata->>'batteryLevel')::int, 0) as battery_level,
        coalesce((a.metadata->'gps'->>'lat')::double precision, 0) as lat,
        coalesce((a.metadata->'gps'->>'lon')::double precision, 0) as lon,
        coalesce(e.event_type, 'long_press') as event_type
      from incidents i
      join devices d on d.id = i.device_id
      left join lateral (
        select metadata
        from audit_logs
        where incident_id = i.id and action = 'incident.triggered'
        order by created_at desc
        limit 1
      ) a on true
      left join lateral (
        select event_type
        from incident_events
        where incident_id = i.id
        order by created_at desc
        limit 1
      ) e on true
      where i.id = $1
      limit 1
    `, [id]);
        if (!result.rows[0]) {
            return undefined;
        }
        return this.toIncident(result.rows[0]);
    }
    async updateIncidentStatus(id, status, actor = "operator") {
        const client = await pool.connect();
        try {
            await client.query("begin");
            const updateResult = await client.query(`
        update incidents
        set status = $2, updated_at = now()
        where id = $1
        returning id, status, updated_at
      `, [id, status]);
            if (!updateResult.rows[0]) {
                await client.query("rollback");
                return undefined;
            }
            await client.query(`
        insert into audit_logs (actor, action, incident_id)
        values ($1, $2, $3)
      `, [actor, `incident.${status}`, id]);
            await client.query("commit");
        }
        catch (error) {
            await client.query("rollback");
            throw error;
        }
        finally {
            client.release();
        }
        return this.getIncident(id);
    }
    async upsertHeartbeat(heartbeat) {
        const deviceId = await this.ensureDevice(pool, heartbeat.deviceId);
        await pool.query(`
      insert into device_heartbeats (device_id, battery_level, is_online, lat, lon, observed_at)
      values ($1, $2, $3, $4, $5, $6)
    `, [
            deviceId,
            heartbeat.batteryLevel,
            heartbeat.isOnline,
            heartbeat.gps?.lat ?? null,
            heartbeat.gps?.lon ?? null,
            heartbeat.timestamp
        ]);
        await pool.query(`
      insert into audit_logs (actor, action, metadata)
      values ($1, $2, $3)
    `, [
            "device",
            "device.heartbeat",
            {
                externalDeviceId: heartbeat.deviceId,
                batteryLevel: heartbeat.batteryLevel,
                isOnline: heartbeat.isOnline
            }
        ]);
        return heartbeat;
    }
    async listHeartbeats() {
        const result = await pool.query(`
      select distinct on (d.external_device_id)
        d.external_device_id,
        h.observed_at,
        h.battery_level,
        h.is_online,
        h.lat,
        h.lon
      from device_heartbeats h
      join devices d on d.id = h.device_id
      order by d.external_device_id, h.observed_at desc
    `);
        return result.rows.map((row) => ({
            deviceId: row.external_device_id,
            timestamp: toIso(row.observed_at),
            batteryLevel: row.battery_level,
            isOnline: row.is_online,
            gps: row.lat !== null && row.lon !== null
                ? {
                    lat: row.lat,
                    lon: row.lon
                }
                : undefined
        }));
    }
    async listAuditLogs() {
        const result = await pool.query(`
      select id, action, actor, incident_id, created_at, metadata
      from audit_logs
      order by created_at desc
      limit 500
    `);
        return result.rows.map((row) => ({
            id: row.id,
            action: row.action,
            actor: row.actor,
            incidentId: row.incident_id ?? undefined,
            createdAt: toIso(row.created_at),
            metadata: row.metadata ?? undefined
        }));
    }
    async ensureDevice(client, externalDeviceId) {
        const found = await client.query(`
      select id
      from devices
      where external_device_id = $1
      limit 1
    `, [externalDeviceId]);
        if (found.rows[0]) {
            return found.rows[0].id;
        }
        const inserted = await client.query(`
      insert into devices (external_device_id)
      values ($1)
      returning id
    `, [externalDeviceId]);
        return inserted.rows[0].id;
    }
    toIncident(row) {
        return {
            id: row.id,
            status: row.status,
            createdAt: toIso(row.created_at),
            updatedAt: toIso(row.updated_at),
            deviceId: row.external_device_id,
            latestGps: {
                lat: row.lat,
                lon: row.lon
            },
            batteryLevel: row.battery_level,
            eventType: row.event_type
        };
    }
}
function toIso(value) {
    if (value instanceof Date) {
        return value.toISOString();
    }
    return new Date(value).toISOString();
}
