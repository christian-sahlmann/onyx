import React, { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChatInputOption } from "./ChatInputOption";
import { getDisplayNameForModel } from "@/lib/hooks";
import {
  checkLLMSupportsImageInput,
  destructureValue,
  structureValue,
} from "@/lib/llm/utils";
import {
  getProviderIcon,
  LLMProviderDescriptor,
} from "@/app/admin/configuration/llm/interfaces";
import { Persona } from "@/app/admin/assistants/interfaces";
import { LlmOverrideManager } from "@/lib/hooks";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FiAlertTriangle } from "react-icons/fi";

interface LLMPopoverProps {
  llmProviders: LLMProviderDescriptor[];
  llmOverrideManager: LlmOverrideManager;
  requiresImageGeneration?: boolean;
  currentAssistant?: Persona;
}

export default function LLMPopover({
  llmProviders,
  llmOverrideManager,
  requiresImageGeneration,
  currentAssistant,
}: LLMPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { llmOverride, updateLLMOverride, globalDefault } = llmOverrideManager;
  const currentLlm = llmOverride.modelName || globalDefault.modelName;

  const llmOptionsByProvider: {
    [provider: string]: {
      name: string;
      value: string;
      icon: React.FC<{ size?: number; className?: string }>;
    }[];
  } = {};
  const uniqueModelNames = new Set<string>();

  llmProviders.forEach((llmProvider) => {
    if (!llmOptionsByProvider[llmProvider.provider]) {
      llmOptionsByProvider[llmProvider.provider] = [];
    }

    (llmProvider.display_model_names || llmProvider.model_names).forEach(
      (modelName) => {
        if (!uniqueModelNames.has(modelName)) {
          uniqueModelNames.add(modelName);
          llmOptionsByProvider[llmProvider.provider].push({
            name: modelName,
            value: structureValue(
              llmProvider.name,
              llmProvider.provider,
              modelName
            ),
            icon: getProviderIcon(llmProvider.provider, modelName),
          });
        }
      }
    );
  });

  const llmOptions = Object.entries(llmOptionsByProvider).flatMap(
    ([provider, options]) => [...options]
  );

  const defaultProvider = llmProviders.find(
    (llmProvider) => llmProvider.is_default_provider
  );

  const defaultModelName = defaultProvider?.default_model_name;
  const defaultModelDisplayName = defaultModelName
    ? getDisplayNameForModel(defaultModelName)
    : null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="focus:outline-none">
          <ChatInputOption
            minimize
            toggle
            flexPriority="stiff"
            name={getDisplayNameForModel(
              llmOverrideManager?.llmOverride.modelName ||
                defaultModelDisplayName ||
                "Models"
            )}
            Icon={getProviderIcon(
              llmOverrideManager?.llmOverride.provider ||
                defaultProvider?.provider ||
                "anthropic",
              llmOverrideManager?.llmOverride.modelName ||
                defaultProvider?.default_model_name ||
                "claude-3-5-sonnet-20240620"
            )}
            tooltipContent="Switch models"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-64 p-1 bg-background border border-gray-200 rounded-md shadow-lg"
      >
        <div className="max-h-[300px] overflow-y-auto">
          {llmOptions.map(({ name, icon, value }, index) => {
            if (!requiresImageGeneration || checkLLMSupportsImageInput(name)) {
              return (
                <button
                  key={index}
                  className={`w-full flex items-center gap-x-2 px-3 py-2 text-sm text-left hover:bg-gray-100 transition-colors duration-150 ${
                    currentLlm === name
                      ? "bg-gray-100 text-text"
                      : "text-text-darker"
                  }`}
                  onClick={() => {
                    updateLLMOverride(destructureValue(value));
                    setIsOpen(false);
                  }}
                >
                  {icon({ size: 16, className: "flex-none my-auto " })}
                  <span className="line-clamp-1 ">
                    {getDisplayNameForModel(name)}
                  </span>
                  {(() => {
                    if (currentAssistant?.llm_model_version_override === name) {
                      return (
                        <span className="flex-none ml-auto text-xs">
                          (assistant)
                        </span>
                      );
                    }
                  })()}
                  {llmOverrideManager.imageFilesPresent &&
                    !checkLLMSupportsImageInput(name) && (
                      <TooltipProvider>
                        <Tooltip delayDuration={0}>
                          <TooltipTrigger className="my-auto flex items-center ml-auto">
                            <FiAlertTriangle className="text-alert" size={16} />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">
                              This LLM is not vision-capable and cannot process
                              image files present in your chat session.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                </button>
              );
            }
            return null;
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
