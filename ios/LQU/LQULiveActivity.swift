//
//  LQULiveActivity.swift
//  LQU
//
//  Created by YO AK on 2024/11/18.
//

import ActivityKit
import WidgetKit
import SwiftUI

struct LQUAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Dynamic stateful properties about your activity go here!
        var emoji: String
    }

    // Fixed non-changing properties about your activity go here!
    var name: String
}

struct LQULiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: LQUAttributes.self) { context in
            // Lock screen/banner UI goes here
            VStack {
                Text("Hello \(context.state.emoji)")
            }
            .activityBackgroundTint(Color.cyan)
            .activitySystemActionForegroundColor(Color.black)

        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI goes here.  Compose the expanded UI through
                // various regions, like leading/trailing/center/bottom
                DynamicIslandExpandedRegion(.leading) {
                    Text("Leading")
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("Trailing")
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text("Bottom \(context.state.emoji)")
                    // more content
                }
            } compactLeading: {
                Text("L")
            } compactTrailing: {
                Text("T \(context.state.emoji)")
            } minimal: {
                Text(context.state.emoji)
            }
            .widgetURL(URL(string: "http://www.apple.com"))
            .keylineTint(Color.red)
        }
    }
}

extension LQUAttributes {
    fileprivate static var preview: LQUAttributes {
        LQUAttributes(name: "World")
    }
}

extension LQUAttributes.ContentState {
    fileprivate static var smiley: LQUAttributes.ContentState {
        LQUAttributes.ContentState(emoji: "😀")
     }
     
     fileprivate static var starEyes: LQUAttributes.ContentState {
         LQUAttributes.ContentState(emoji: "🤩")
     }
}

#Preview("Notification", as: .content, using: LQUAttributes.preview) {
   LQULiveActivity()
} contentStates: {
    LQUAttributes.ContentState.smiley
    LQUAttributes.ContentState.starEyes
}
