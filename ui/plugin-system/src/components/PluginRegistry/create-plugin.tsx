// Copyright 2021 The Perses Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { useRef } from 'react';
import { JsonObject, VariableDefinition } from '@perses-dev/core';
import {
  PanelProps,
  PanelPlugin,
  PluginConfig,
  PluginDefinition,
  PluginType,
  VariablePlugin,
  GraphQueryPlugin,
  GraphQueryDefinition,
} from '../../model';

/**
 * Take a Variable plugin and wrap it so it works with AnyVariableDefinition,
 * doing runtime checking of the definition before delegating to the plugin.
 */
export function createVariablePlugin<Options extends JsonObject>(
  config: PluginConfig<'Variable', Options>
): VariablePlugin {
  // Create runtime validation function
  const useRuntimeValidation = createValidationHook(config);

  // Wrap hook with validation (TODO: Can this wrapper become generic for all
  // plugin hooks?)
  function useVariableOptions(definition: VariableDefinition) {
    const { isValid, errorRef } = useRuntimeValidation();
    if (isValid(definition)) {
      return config.plugin.useVariableOptions(definition);
    }
    throw errorRef.current;
  }

  return {
    useVariableOptions,
  };
}

/**
 * Take a Panel plugin and wraps it so it works with AnyPanelDefinition, doing
 * runtime checking of the definition before delegating to the plugin.
 */
export function createPanelPlugin<Options extends JsonObject>(config: PluginConfig<'Panel', Options>): PanelPlugin {
  const useRuntimeValidation = createValidationHook(config);

  // Wrap PanelComponent from config with validation (TODO: Can this wrapper
  // become generic for all Plugin components?)
  function PanelComponent(props: PanelProps<JsonObject>) {
    const { definition, ...others } = props;

    const { isValid, errorRef } = useRuntimeValidation();
    if (isValid(definition)) {
      const { PanelComponent } = config.plugin;
      return <PanelComponent definition={definition} {...others} />;
    }
    throw errorRef.current;
  }

  return {
    PanelComponent,
  };
}

/**
 * Take a GraphQuery plugin and wrap it so it works with AnyChartQueryDefinition,
 * doing runtime validation of the definition before delegating to the plugin.
 */
export function createGraphQueryPlugin<Options extends JsonObject>(
  config: PluginConfig<'GraphQuery', Options>
): GraphQueryPlugin {
  // Create runtime validation function
  const useRuntimeValidation = createValidationHook(config);

  // Wrap hook with validation (TODO: Can this wrapper become generic for all
  // plugin hooks?)
  function useGraphQuery(definition: GraphQueryDefinition) {
    const { isValid, errorRef } = useRuntimeValidation();
    if (isValid(definition)) {
      return config.plugin.useGraphQuery(definition);
    }
    throw errorRef.current;
  }

  return {
    useGraphQuery,
  };
}

// A hook for doing runtime validation of a PluginDefinition
type UseRuntimeValidationHook<Type extends PluginType, Options extends JsonObject> = () => {
  isValid: (definition: PluginDefinition<Type, JsonObject>) => definition is PluginDefinition<Type, Options>;
  errorRef: React.MutableRefObject<InvalidPluginDefinitionError | undefined>;
};

// Create a hook for doing runtime validation of a plugin definition, given the
// plugin's config
function createValidationHook<Type extends PluginType, Options extends JsonObject>(
  config: PluginConfig<Type, Options>
): UseRuntimeValidationHook<Type, Options> {
  const useRuntimeValidation = () => {
    // Ref for storing any validation errors as a side-effect of calling isValid
    const errorRef = useRef<InvalidPluginDefinitionError | undefined>(undefined);

    // Type guard that validates the generic runtime plugin definition data
    // is correct for Kind/Options
    const isValid = (definition: PluginDefinition<Type, JsonObject>): definition is PluginDefinition<Type, Options> => {
      // If they don't give us a validate function in the plugin config, not
      // much we can do so just assume we're OK
      const validateErrors = config.validate?.(definition) ?? [];
      if (validateErrors.length === 0) return true;

      errorRef.current = new InvalidPluginDefinitionError(config.pluginType, config.kind, validateErrors);
      return false;
    };

    return {
      isValid,
      errorRef,
    };
  };

  return useRuntimeValidation;
}

/**
 * Thrown when ConfigData fails the runtime validation check for a plugin.
 */
export class InvalidPluginDefinitionError extends Error {
  constructor(readonly pluginType: PluginType, readonly kind: string, readonly validateErrors: string[]) {
    super(`Invalid ${pluginType} plugin definition for kind ${kind}`);
  }
}
