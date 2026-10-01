import SwiftUI
import TipKit
import UIKit

@main struct EthicaLiveApp: App {
  @UIApplicationDelegateAdaptor(EthicaAppDelegate.self) private var delegate
  @StateObject private var session = AppSession()
  @StateObject private var previewStore = MockStore()
  init() {
    // Preserve native glass tracking; only the selected label uses the app accent.
    UISegmentedControl.appearance().setTitleTextAttributes(
      [.foregroundColor: UIColor.systemBlue], for: .selected)
    if #available(iOS 17.0, *) { try? Tips.configure([.displayFrequency(.daily)]) }
  }
  var body: some Scene {
    WindowGroup {
      Group {
        #if DEBUG
          if AppConfiguration.onboardingPreview {
            if ProcessInfo.processInfo.arguments.contains("-design-admin") {
              AdminDesignPreview().environmentObject(previewStore)
            } else if ProcessInfo.processInfo.arguments.contains("-design-widgets") {
              RootView().environmentObject(previewStore)
            } else if ProcessInfo.processInfo.arguments.contains("-design-today") {
              RootView().environmentObject(previewStore)
                .onAppear {
                  if ProcessInfo.processInfo.arguments.contains("-design-today-completed") {
                    previewStore.submit(0)
                    previewStore.submitFollowup(0)
                  }
                }
            } else if ProcessInfo.processInfo.arguments.contains("-design-analysis") {
              RootView(initialTab: 1).environmentObject(previewStore)
                .onAppear {
                  if ProcessInfo.processInfo.arguments.contains("-design-today-completed") {
                    previewStore.submit(0)
                    previewStore.submitFollowup(0)
                    previewStore.analysisPeriod = 0
                  }
                }
            } else {
              OnboardingDesignPreview()
            }
          } else if ProcessInfo.processInfo.arguments.contains("-mock-preview") {
            RootView().environmentObject(previewStore)
          } else {
            LiveRootView().environmentObject(session)
          }
        #else
          LiveRootView().environmentObject(session)
        #endif
      }.tint(.blue)
    }
  }
}
