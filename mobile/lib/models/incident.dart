class GeoPoint {
  final double lat;
  final double lon;

  const GeoPoint({required this.lat, required this.lon});

  factory GeoPoint.fromJson(Map<String, dynamic> json) {
    return GeoPoint(
      lat: (json['lat'] as num).toDouble(),
      lon: (json['lon'] as num).toDouble(),
    );
  }
}

class Incident {
  final String id;
  final String status;
  final String createdAt;
  final String deviceId;
  final int batteryLevel;
  final GeoPoint latestGps;

  const Incident({
    required this.id,
    required this.status,
    required this.createdAt,
    required this.deviceId,
    required this.batteryLevel,
    required this.latestGps,
  });

  factory Incident.fromJson(Map<String, dynamic> json) {
    return Incident(
      id: json['id'] as String,
      status: json['status'] as String,
      createdAt: json['createdAt'] as String,
      deviceId: json['deviceId'] as String,
      batteryLevel: json['batteryLevel'] as int,
      latestGps: GeoPoint.fromJson(json['latestGps'] as Map<String, dynamic>),
    );
  }
}
