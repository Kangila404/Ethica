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
      LaunchPresentation {
      Group {
        #if DEBUG
          if AppConfiguration.onboardingPreview {
            if ProcessInfo.processInfo.arguments.contains("-design-keyboard") {
              KeyboardDesignPreview().environmentObject(previewStore)
            } else if ProcessInfo.processInfo.arguments.contains("-design-admin") {
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
                  if ProcessInfo.processInfo.arguments.contains("-design-analysis-ready") {
                    previewStore.analysisPreviewReady = true
                    previewStore.analysisSection = 0
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
}

/// The static system launch screen and this brief transition share the same vector mark.
private struct LaunchPresentation<Content: View>: View {
  @ViewBuilder let content: () -> Content
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var visible = true
  @State private var appeared = false
  var body: some View {
    ZStack {
      content().allowsHitTesting(!visible).accessibilityHidden(visible)
      if visible {
        ZStack {
          Color("LaunchBackground").ignoresSafeArea()
          Image("LaunchMark").resizable().scaledToFit().frame(width: 112, height: 112)
            .scaleEffect(appeared && !reduceMotion ? 1.025 : 1)
            .accessibilityHidden(true)
          Text("Ethica").font(.system(size: 32, weight: .regular, design: .serif))
            .foregroundStyle(.white.opacity(0.94)).offset(y: 104).opacity(appeared ? 1 : 0)

        }.transition(.opacity).zIndex(1)
      }
    }
    .task {
      withAnimation(reduceMotion ? nil : .easeOut(duration: 0.55)) { appeared = true }
      do { try await Task.sleep(nanoseconds: 650_000_000) } catch { return }
      // Branding must never wait for authentication or network completion.
      withAnimation(.easeOut(duration: reduceMotion ? 0.1 : 0.3)) { visible = false }
    }
  }
}

#if DEBUG
private struct KeyboardDesignPreview: View {
  @State private var editing = false
  @State private var name = "에티카"
  var body: some View {
    RootView()
      .sheet(isPresented: $editing) {
        NavigationStack { NicknameEditor(initialName: name) { name = $0 } }
          .modifier(CompactEditorSheet(editor: .nickname))
      }
      .task {
        do { try await Task.sleep(nanoseconds: 1_100_000_000) } catch { return }
        editing = true
      }
  }
}
#endif
