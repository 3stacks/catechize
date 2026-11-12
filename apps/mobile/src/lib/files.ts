import * as DocumentPicker from 'expo-document-picker'
import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { Platform } from 'react-native'
import { download } from '../../../../src/store/takeout.ts'

// Save a backup and open one. The files are the same as the web app's, so a
// backup moves between the web app and the mobile app.

/** Give a file to the learner: the share sheet on a phone, a download on the web. */
export async function saveFile(name: string, type: string, text: string) {
  if (Platform.OS === 'web') return download(name, type, text)
  const file = new File(Paths.cache, name)
  file.create({ overwrite: true })
  await file.write(text)
  await Sharing.shareAsync(file.uri, { mimeType: type, dialogTitle: name, UTI: type === 'text/csv' ? 'public.comma-separated-values-text' : 'public.json' })
}

/** Let the learner choose a file. Returns its text, or undefined when the learner cancels. */
export async function openFile(): Promise<string | undefined> {
  const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true })
  const asset = res.canceled ? undefined : res.assets[0]
  if (!asset) return undefined
  if (asset.file) return asset.file.text()
  return new File(asset.uri).text()
}
