import { execFileSync } from 'node:child_process'
import console from 'node:console'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import process from 'node:process'

const root = process.cwd()
const privatePath = /^(?:AGENTS\.md|\.agents\/|\.codex\/|docs\/design\/)/
const privateAsset = /(?:docs\/design|sudocoach-(?:brand-board|mascot-states|icon-system|achievement-badges))/i
const legacyTerms = ['sudo' + 'scan', 'sudo' + 'solver', 'sudo' + ' scan']
const legacyIdentity = new RegExp(legacyTerms.join('|'), 'i')
const textAsset = /\.(?:css|html|js|json|mjs|svg|webmanifest)$/i

const command = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' })
const fail = (message) => {
  console.error(`Public-surface verification failed: ${message}`)
  process.exitCode = 1
}

const tracked = command(['ls-files', '-z']).split('\0').filter(Boolean)
const privateTracked = tracked.filter((path) => privatePath.test(path) || privateAsset.test(path))
if (privateTracked.length) fail(`private files are tracked:\n${privateTracked.join('\n')}`)

const historyObjects = command(['rev-list', '--objects', 'HEAD']).split('\n')
  .map((line) => line.split(' ').slice(1).join(' '))
  .filter(Boolean)
const privateHistory = historyObjects.filter((path) => privatePath.test(path) || privateAsset.test(path) || path === 'public/icons/icon.svg')
if (privateHistory.length) fail(`private or retired assets remain in reachable history:\n${privateHistory.join('\n')}`)

const revisions = command(['rev-list', 'HEAD']).trim().split('\n').filter(Boolean)
for (const revision of revisions) {
  try {
    const matches = command(['grep', '-I', '-i', '-n', '-E', legacyTerms.join('|'), revision, '--', '.']).trim()
    if (matches) fail(`legacy identity remains in ${revision}:\n${matches}`)
  } catch (error) {
    if (error.status !== 1) throw error
  }
}

const dist = resolve(root, 'dist')
if (!existsSync(dist)) {
  fail('dist/ is missing; run the production build before verifying the deployment surface')
} else {
  const files = []
  const visit = (directory) => {
    for (const entry of readdirSync(directory)) {
      const path = resolve(directory, entry)
      if (statSync(path).isDirectory()) visit(path)
      else files.push(path)
    }
  }
  visit(dist)
  for (const path of files) {
    const deployedPath = relative(dist, path)
    if (deployedPath.endsWith('.map')) fail(`source map is deployed: ${deployedPath}`)
    if (privateAsset.test(deployedPath)) fail(`private design asset is deployed: ${deployedPath}`)
    if (textAsset.test(path)) {
      const contents = readFileSync(path, 'utf8')
      if (privateAsset.test(contents)) fail(`private design reference is deployed in: ${deployedPath}`)
      if (legacyIdentity.test(contents)) fail(`legacy identity is deployed in: ${deployedPath}`)
    }
  }
}

if (process.exitCode) process.exit(process.exitCode)
console.log('Public surface is clean.')
