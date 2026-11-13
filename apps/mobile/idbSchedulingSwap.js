// fake-indexeddb schedules its tasks with setImmediate. In React Native that is
// a microtask, and transactions then commit too early. Metro uses
// src/store/idbScheduling.ts in place of the scheduling.js of each build.
// This file has no dependencies, so the root tests can check it with no Expo.
const path = require('node:path')

const SCHEDULING = /[\\/]fake-indexeddb[\\/]build[\\/](esm|cjs)[\\/]lib[\\/]scheduling\.js$/
const replacement = path.join(__dirname, 'src/store/idbScheduling.ts')

/** The file that Metro must use in place of `filePath`, or undefined to keep it. */
const swapIdbScheduling = (filePath) => (SCHEDULING.test(filePath) ? replacement : undefined)

module.exports = { swapIdbScheduling }
