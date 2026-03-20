import 'dart:convert';
import 'package:http/http.dart' as http;

import '../models/incident.dart';

class ApiClient {
  final String baseUrl;

  const ApiClient({required this.baseUrl});

  Future<List<Incident>> fetchIncidents() async {
    final response = await http.get(Uri.parse('$baseUrl/api/incidents'));
    if (response.statusCode != 200) {
      throw Exception('Failed to load incidents');
    }

    final decoded = jsonDecode(response.body) as List<dynamic>;
    return decoded
        .map((item) => Incident.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<void> triggerDemoIncident() async {
    final payload = {
      'deviceId': 'BR-1001',
      'eventType': 'long_press',
      'timestamp': DateTime.now().toUtc().toIso8601String(),
      'batteryLevel': 80,
      'gps': {'lat': 12.9716, 'lon': 77.5946},
      'signature': 'mobile-sim-signature'
    };

    final response = await http.post(
      Uri.parse('$baseUrl/api/incidents/trigger'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(payload),
    );

    if (response.statusCode != 201) {
      throw Exception('Failed to trigger incident');
    }
  }
}
