import Foundation
@main struct ModelCheck {
    @MainActor static func main() {
        let store = MockStore()
        assert(store.answer == nil && store.followup == nil)
        store.submitFollowup(0)
        assert(store.followup == nil, "Followup requires a first answer")
        store.submit(0)
        store.submit(1)
        assert(store.answer == 0, "First submission must remain immutable")
        store.submitFollowup(1)
        store.submitFollowup(0)
        assert(store.followup == 1, "Followup must remain immutable")
        store.reset()
        assert(store.answer == nil && store.followup == nil)
        assert(Set(Library.essays.map(\.id)).count == Library.essays.count)
        assert(Library.essays.allSatisfy { !$0.pages.isEmpty })
        print("PASS: answer lifecycle, duplicate prevention, reset, unique post IDs, reader pages")
    }
}
