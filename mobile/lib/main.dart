import 'package:flutter/material.dart';
import 'screens/home_screen.dart';

void main() {
  runApp(const NariShieldApp());
}

class NariShieldApp extends StatelessWidget {
  const NariShieldApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'NariShield',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.indigo),
        useMaterial3: true,
      ),
      home: const HomeScreen(),
    );
  }
}
