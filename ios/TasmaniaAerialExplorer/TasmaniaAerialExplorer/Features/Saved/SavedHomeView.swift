import SwiftUI

struct SavedHomeView: View {
  var body: some View {
    ContentUnavailableView(
      "No Saved Photos",
      systemImage: "bookmark",
      description: Text("Favorites and recently viewed imagery will be stored locally first, with Cloudflare sync added later.")
    )
    .navigationTitle("Saved")
  }
}

#Preview {
  NavigationStack {
    SavedHomeView()
  }
}

