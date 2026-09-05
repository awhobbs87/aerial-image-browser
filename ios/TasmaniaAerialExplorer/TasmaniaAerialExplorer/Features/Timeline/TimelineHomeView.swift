import SwiftUI

struct TimelineHomeView: View {
  var body: some View {
    List {
      Section("Decades") {
        ForEach(["1940s", "1950s", "1960s", "1970s", "1980s", "1990s"], id: \.self) { decade in
          NavigationLink {
            Text("\(decade) photos will appear here.")
              .foregroundStyle(.secondary)
              .navigationTitle(decade)
          } label: {
            Label(decade, systemImage: "calendar")
          }
        }
      }
    }
    .navigationTitle("Timeline")
  }
}

#Preview {
  NavigationStack {
    TimelineHomeView()
  }
}

