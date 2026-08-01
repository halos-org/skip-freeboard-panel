// Signal K server plugin that registers Skip as a Freeboard-SK "plotter extension":
// a read-only `plotterExtensions` resource whose manifest tells a supporting chartplotter
// (Freeboard-SK) to offer a toolbar button that opens Skip in a side panel, plus Wind Steer
// widgets. See https://github.com/SignalK/freeboard-sk/blob/master/docs/api/plotter_extension_provider_plugins.md
//
// The panel/widget iframes are the Skip webapp served by the companion `@halos-org/skip`
// package at its fixed serving path, so the same-origin session authenticates them. Those
// URLs are the cross-package contract between this plugin and the Skip webapp.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Read our own version at runtime rather than importing package.json into the compilation:
// the compiled `dist/index.js` sits one level below the package root, so `../package.json`
// resolves to the shipped root manifest.
const { version } = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8')) as {
  version: string
}

const PLUGIN_ID = 'skip-plotter-panel'
const SKIP_URL = '/@halos-org/skip/'
// The panel iframe boots Skip in chromeless embed mode. The flag rides in the pre-hash query
// string so Skip's in-app (hash) navigation preserves it. No profile is baked in.
const SKIP_PANEL_URL = `${SKIP_URL}?embed=1`
// A widget iframe boots the same chromeless Skip on its single-widget route (`#/widget/<type>`).
const skipWidgetUrl = (widgetType: string): string => `${SKIP_URL}?embed=1#/widget/${widgetType}`
const skipWidgetConfigUrl = (widgetType: string): string =>
  `${SKIP_URL}?embed=1#/widget-config/${widgetType}`
const WIND_STEER_TYPE = 'widget-wind-steer'
const WIND_STEER_CONFIG_PANEL = 'wind-steer-config'

interface Widget {
  id: string
  title: string
  type: 'iframe'
  url: string
  size: string
  configPanel: string
  lifecycle: string
}

interface Panel {
  id: string
  title: string
  type: 'iframe'
  url: string
  lifecycle: string
}

interface Button {
  id: string
  title: string
  slot: string
  icon: string
  action: { type: string; panel: string }
}

interface PluginManifest {
  name: string
  description: string
  version: string
  apiVersion: string
  requires: string[]
  optional: string[]
  widgets: Widget[]
  panels: Panel[]
  buttons: Button[]
}

interface ResourceProvider {
  type: string
  methods: {
    listResources: () => Promise<Record<string, PluginManifest>>
    getResource: (id: string) => Promise<PluginManifest>
    setResource: (id: string, value: unknown) => Promise<void>
    deleteResource: (id: string) => Promise<void>
  }
}

interface PluginApp {
  registerResourceProvider: (provider: ResourceProvider) => void
  setPluginStatus: (message: string) => void
}

interface Plugin {
  id: string
  name: string
  description: string
  schema: Record<string, unknown>
  start: () => void
  stop: () => void
}

function createSkipPanelPlugin(app: PluginApp): Plugin {
  let running = false

  function buildManifest(): PluginManifest {
    return {
      name: 'Skip',
      description: 'Opens the Skip instrument panel inside Freeboard-SK.',
      version,
      apiVersion: '1',
      // 'widgets' is intentionally absent from `requires`: the panel is the primary
      // contribution, so requiring widget support would drop the whole extension on hosts
      // that lack it. Widget-capable hosts render the additive widgets[] below.
      requires: ['panels.iframe', 'buttons'],
      optional: ['widgets', 'state'],
      widgets: [
        {
          id: 'wind-steer-1x1',
          title: 'Wind Steer',
          type: 'iframe',
          url: skipWidgetUrl(WIND_STEER_TYPE),
          size: '1x1',
          configPanel: WIND_STEER_CONFIG_PANEL,
          lifecycle: 'whileEnabled'
        },
        {
          id: 'wind-steer-2x2',
          title: 'Wind Steer',
          type: 'iframe',
          url: skipWidgetUrl(WIND_STEER_TYPE),
          size: '2x2',
          configPanel: WIND_STEER_CONFIG_PANEL,
          lifecycle: 'whileEnabled'
        }
      ],
      panels: [
        {
          id: 'skip-panel',
          title: 'Skip',
          type: 'iframe',
          url: SKIP_PANEL_URL,
          lifecycle: 'keepAlive'
        },
        {
          id: WIND_STEER_CONFIG_PANEL,
          title: 'Wind Steer settings',
          type: 'iframe',
          url: skipWidgetConfigUrl(WIND_STEER_TYPE),
          lifecycle: 'onOpen'
        }
      ],
      buttons: [
        {
          id: 'skip-open',
          title: 'Skip',
          slot: 'mapToolbar',
          icon: 'insights',
          action: { type: 'togglePanel', panel: 'skip-panel' }
        }
      ]
    }
  }

  return {
    id: PLUGIN_ID,
    name: 'Skip Freeboard Panel',
    description: 'Registers Skip as a Freeboard-SK plotter-extension panel.',
    schema: { type: 'object', properties: {} },
    start() {
      app.registerResourceProvider({
        type: 'plotterExtensions',
        methods: {
          listResources: () =>
            Promise.resolve<Record<string, PluginManifest>>(
              running ? { [PLUGIN_ID]: buildManifest() } : {}
            ),
          getResource: (id: string) =>
            !running || id !== PLUGIN_ID
              ? Promise.reject(new Error(`No such plotterExtensions resource: ${id}`))
              : Promise.resolve(buildManifest()),
          setResource: () => Promise.reject(new Error(`${PLUGIN_ID} is a read-only provider`)),
          deleteResource: () => Promise.reject(new Error(`${PLUGIN_ID} is a read-only provider`))
        }
      })
      running = true
      app.setPluginStatus(`Skip panel registered at ${SKIP_PANEL_URL}`)
    },
    stop() {
      running = false
    }
  }
}

export = createSkipPanelPlugin
