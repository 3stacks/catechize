// The entry point. The store must load before anything imports Dexie, because
// Dexie reads the IndexedDB globals when it loads (src/store/idb.native.ts).
import './src/store/idb'
import 'expo-router/entry'
