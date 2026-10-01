// swift-tools-version: 5.9
import PackageDescription

// Portable transport/session checks; the application is built with Ethica.xcodeproj.
let package = Package(
  name: "EthicaCore",
  platforms: [.macOS(.v13), .iOS(.v16)],
  targets: [
    .target(
      name: "EthicaCore", path: "Ethica/Live",
      exclude: [
        "AdminViews.swift", "AppSession.swift", "AppShortcuts.swift", "Components.swift",
        "DailyAndAnalysis.swift", "LearningAndArchive.swift", "LiveApp.swift", "InsightsArchiveDesign.swift",
        "OnboardingFlow.swift", "OnboardingPresentation.swift", "OnboardingPreview.swift", "PushNotifications.swift", "SettingsAndSupport.swift",
        "SocialAuthentication.swift", "WidgetSnapshot.swift",
      ], sources: ["APIClient.swift", "Models.swift"]),
    .testTarget(
      name: "EthicaCoreTests", dependencies: ["EthicaCore"], path: "EthicaTests",
      sources: ["APIClientTests.swift"]),
  ]
)
