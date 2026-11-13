import * as WebBrowser from 'expo-web-browser'
import { Linking } from 'react-native'
import { appLink } from './appLink.ts'

/**
 * Open a link (the Self-Interpreting Bible, further reading, a source). A link
 * to Precentor, Covenant Household or Haddington Bible opens that app when it
 * is on the device. Any other link, or a sibling app that is not installed,
 * opens in the in-app browser.
 */
export function open(url: string) {
  void (async () => {
    const app = appLink(url, 'hearers')
    if (app) {
      try {
        await Linking.openURL(app)
        return
      } catch {
        // The app is not on the device. Open the website.
      }
    }
    await WebBrowser.openBrowserAsync(url).catch(() => {
      // The browser did not open. There is nothing more to do.
    })
  })()
}
