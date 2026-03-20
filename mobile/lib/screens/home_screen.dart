import 'package:flutter/material.dart';

import '../models/incident.dart';
import '../services/api_client.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  static const apiClient = ApiClient(baseUrl: 'http://localhost:4000');
  List<Incident> incidents = [];
  bool isLoading = true;
  int selectedTab = 0;

  @override
  void initState() {
    super.initState();
    refresh();
  }

  Future<void> refresh() async {
    setState(() => isLoading = true);
    try {
      final fetched = await apiClient.fetchIncidents();
      if (!mounted) return;
      setState(() {
        incidents = fetched;
      });
    } finally {
      if (mounted) {
        setState(() => isLoading = false);
      }
    }
  }

  Future<void> triggerIncident() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Trigger SOS?'),
          content: const Text('This will send an emergency alert to the command center.'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
            FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Trigger')),
          ],
        );
      },
    );

    if (confirmed != true) {
      return;
    }

    await apiClient.triggerDemoIncident();
    await refresh();
    if (!mounted) {
      return;
    }
    setState(() => selectedTab = 1);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Emergency alert sent')),
    );
  }

  Incident? get latestIncident => incidents.isEmpty ? null : incidents.first;

  bool get hasActiveIncident {
    final incident = latestIncident;
    if (incident == null) return false;
    return incident.status != 'closed';
  }

  Color statusColor(String status) {
    switch (status) {
      case 'triggered':
        return const Color(0xFFEF3F83);
      case 'acknowledged':
        return const Color(0xFFF59E0B);
      case 'dispatched':
        return const Color(0xFF3B82F6);
      case 'closed':
        return const Color(0xFF10B981);
      default:
        return const Color(0xFF64748B);
    }
  }

  double timelineProgress(String status) {
    switch (status) {
      case 'triggered':
        return 0.25;
      case 'acknowledged':
        return 0.55;
      case 'dispatched':
        return 0.82;
      case 'closed':
        return 1;
      default:
        return 0.2;
    }
  }

  @override
  Widget build(BuildContext context) {
    final incident = latestIncident;
    final pageIndex = selectedTab == 1 && hasActiveIncident ? 1 : 0;

    return Scaffold(
      backgroundColor: const Color(0xFFF9F0F4),
      body: SafeArea(
        child: isLoading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: refresh,
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    if (pageIndex == 0) _buildHomePage(),
                    if (pageIndex == 1 && incident != null) _buildActiveIncidentPage(incident),
                  ],
                ),
              ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: selectedTab,
        indicatorColor: const Color(0xFFFFE5EF),
        onDestinationSelected: (index) => setState(() => selectedTab = index),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.notifications_outlined), selectedIcon: Icon(Icons.notifications), label: 'Alerts'),
          NavigationDestination(icon: Icon(Icons.group_outlined), selectedIcon: Icon(Icons.group), label: 'Contacts'),
          NavigationDestination(icon: Icon(Icons.settings_outlined), selectedIcon: Icon(Icons.settings), label: 'Settings'),
        ],
      ),
    );
  }

  Widget _buildHomePage() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const CircleAvatar(
              radius: 18,
              backgroundColor: Color(0xFFFFE5EF),
              child: Icon(Icons.shield_outlined, color: Color(0xFFEF3F83)),
            ),
            const SizedBox(width: 10),
            const Expanded(
              child: Text(
                'NariShield',
                style: TextStyle(fontSize: 30, fontWeight: FontWeight.w800, color: Color(0xFF1E293B)),
              ),
            ),
            IconButton(onPressed: refresh, icon: const Icon(Icons.notifications_none_rounded, color: Color(0xFFEF3F83))),
          ],
        ),
        const SizedBox(height: 16),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFF4D8E4)),
          ),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Safety Status', style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
              SizedBox(height: 8),
              Text('You are safe', style: TextStyle(fontSize: 34, fontWeight: FontWeight.w800, color: Color(0xFF111827))),
              SizedBox(height: 8),
              Text('Current: San Francisco, Downtown', style: TextStyle(color: Color(0xFF64748B))),
            ],
          ),
        ),
        const SizedBox(height: 22),
        const Center(
          child: Text(
            'Emergency Help',
            style: TextStyle(fontSize: 42, fontWeight: FontWeight.w800, color: Color(0xFF111827)),
          ),
        ),
        const SizedBox(height: 18),
        Center(
          child: GestureDetector(
            onTap: triggerIncident,
            child: Container(
              width: 210,
              height: 210,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: Color(0xFFEF3F83),
                boxShadow: [
                  BoxShadow(color: Color(0x50000000), blurRadius: 24, offset: Offset(0, 12)),
                ],
              ),
              child: const Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.shield_outlined, color: Colors.white, size: 42),
                  SizedBox(height: 8),
                  Text('TRIGGER SOS', style: TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.w900)),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 14),
        const Center(
          child: Text(
            'Hold for 3 seconds to send\nemergency alert',
            textAlign: TextAlign.center,
            style: TextStyle(color: Color(0xFF64748B), fontSize: 24),
          ),
        ),
        const SizedBox(height: 24),
        const Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Trusted Contacts', style: TextStyle(fontSize: 29, fontWeight: FontWeight.w800)),
            Text('View all', style: TextStyle(color: Color(0xFFEF3F83), fontWeight: FontWeight.w700, fontSize: 24)),
          ],
        ),
        const SizedBox(height: 10),
        const Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _Contact(name: 'Mom', initials: 'M'),
            _Contact(name: 'Brother', initials: 'B'),
            _Contact(name: 'Sarah', initials: 'S'),
            _Contact(name: 'Add', initials: '+', dashed: true),
          ],
        ),
      ],
    );
  }

  Widget _buildActiveIncidentPage(Incident incident) {
    final progress = timelineProgress(incident.status);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Row(
          children: [
            Icon(Icons.close, color: Color(0xFF334155)),
            Expanded(
              child: Column(
                children: [
                  Text('Active Incident', style: TextStyle(fontSize: 33, fontWeight: FontWeight.w800)),
                  Text('• LIVE TRACKING', style: TextStyle(color: Color(0xFFEF3F83), fontWeight: FontWeight.w700, fontSize: 21)),
                ],
              ),
            ),
            Icon(Icons.info_outline, color: Color(0xFFEF3F83)),
          ],
        ),
        const SizedBox(height: 14),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Help is on the way', style: TextStyle(fontSize: 34, fontWeight: FontWeight.w800)),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(color: const Color(0xFFFFE5EF), borderRadius: BorderRadius.circular(999)),
                    child: const Text('4 MINS', style: TextStyle(color: Color(0xFFEF3F83), fontWeight: FontWeight.w800, fontSize: 20)),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              const Text('Emergency responders dispatched', style: TextStyle(color: Color(0xFF64748B), fontSize: 23)),
              const SizedBox(height: 12),
              ClipRRect(
                borderRadius: BorderRadius.circular(999),
                child: LinearProgressIndicator(
                  minHeight: 8,
                  value: progress,
                  backgroundColor: const Color(0xFFE7EDF6),
                  color: statusColor(incident.status),
                ),
              ),
              const SizedBox(height: 4),
              const Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('TRIGGERED', style: TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF94A3B8), fontSize: 17)),
                  Text('ARRIVING', style: TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF94A3B8), fontSize: 17)),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        const Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Responder Location', style: TextStyle(fontSize: 30, fontWeight: FontWeight.w800)),
            Row(
              children: [
                Text('Live share', style: TextStyle(color: Color(0xFF64748B), fontSize: 22)),
                SizedBox(width: 8),
                Icon(Icons.toggle_on, color: Color(0xFFEF3F83), size: 40),
              ],
            ),
          ],
        ),
        const SizedBox(height: 8),
        Container(
          height: 180,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            gradient: const LinearGradient(colors: [Color(0xFF93C5FD), Color(0xFFBFDBFE)]),
          ),
          child: const Center(
            child: Text('Map Placeholder', style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.w700)),
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: FilledButton.icon(
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  backgroundColor: const Color(0xFFEF3F83),
                ),
                onPressed: () {},
                icon: const Icon(Icons.call),
                label: const Text('Call 112'),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
                onPressed: () {},
                icon: const Icon(Icons.chat_bubble_outline),
                label: const Text('Chat'),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        const Text('Incident Timeline', style: TextStyle(fontSize: 30, fontWeight: FontWeight.w800)),
        const SizedBox(height: 8),
        _TimelineItem(title: 'Responders Dispatched', detail: 'Unit #402 is 1.2km away', time: '12:44 PM', active: true),
        const _TimelineItem(title: 'Police Notified', detail: 'Local station received signal', time: '12:43 PM'),
        const _TimelineItem(title: 'SOS Triggered', detail: 'Location and audio recording started', time: '12:42 PM'),
      ],
    );
  }
}

class _Contact extends StatelessWidget {
  final String name;
  final String initials;
  final bool dashed;

  const _Contact({required this.name, required this.initials, this.dashed = false});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(
              color: const Color(0xFFEF3F83),
              style: dashed ? BorderStyle.solid : BorderStyle.solid,
              width: 2,
            ),
            color: dashed ? const Color(0xFFFFEEF5) : const Color(0xFFFFD9E8),
          ),
          child: Center(
            child: Text(
              initials,
              style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF1E293B)),
            ),
          ),
        ),
        const SizedBox(height: 6),
        Text(name, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
      ],
    );
  }
}

class _TimelineItem extends StatelessWidget {
  final String title;
  final String detail;
  final String time;
  final bool active;

  const _TimelineItem({required this.title, required this.detail, required this.time, this.active = false});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          margin: const EdgeInsets.only(top: 4),
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: active ? const Color(0xFFEF3F83) : const Color(0xFFCBD5E1),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
                Text(detail, style: const TextStyle(color: Color(0xFF64748B))),
                Text(time, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
