const { DEFAULT_PARAMETERS, PRESETS } = require('../config/parameters');
const MODELS = require('../config/models');

class ConfigManager {
  constructor() {
    this.models = MODELS;
    this.presets = PRESETS;
    this.defaults = DEFAULT_PARAMETERS;
  }

  /**
   * Merges a dynamic configuration with a named preset or the default parameters.
   * @param {object} dynamicConfig - The dynamic configuration from the user.
   * @param {string} presetName - The name of the preset to use (e.g., 'FAST', 'BALANCED').
   * @returns {object} The merged configuration.
   */
  mergeWithDefaults(dynamicConfig = {}, presetName = 'BALANCED') {
    const preset = this.presets[presetName] || this.defaults;
    const mergedConfig = {
      ...this.defaults,
      ...preset,
      ...dynamicConfig,
    };

    // Ensure model is valid, otherwise use default
    if (!Object.values(this.models).includes(mergedConfig.model)) {
      mergedConfig.model = this.models.WAN_V2_2_PLUS;
    }

    return mergedConfig;
  }
}

module.exports = new ConfigManager();
