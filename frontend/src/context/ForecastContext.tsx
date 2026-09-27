import { createContext, useContext, useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import {
  LOCATIONS,
  VARIABLES,
  LEAD_TIMES,
  MODELS,
  getForecastBundle,
} from '../data/replayData';
import type {
  LocationInfo,
  VariableInfo,
  ModelInfo,
  ReplayForecastPoint,
} from '../data/replayData';
import { computeUnifiedBlend } from '../data/blendEngine';
import type { BlendingStrategy } from '../data/blendEngine';
import type { FullAdaptiveBlendResult } from '../data/trustEngine';
import {
  computeProbabilisticBlendEngine,
  calculateThresholdProbability,
  getVariableThresholdPresets,
  computeBrierScores,
} from '../data/probabilisticEngine';
import type {
  ProbabilisticBlendBundle,
  ThresholdExceedanceCard,
  BrierScoreItem,
} from '../data/probabilisticEngine';

export interface ForecastContextType {
  selectedLocation: string;
  selectedVariable: string;
  selectedLeadTime: number;
  selectedThreshold: number;
  blendingStrategy: BlendingStrategy;
  modelSwitches: Record<string, boolean>;
  locations: LocationInfo[];
  variables: VariableInfo[];
  leadTimes: number[];
  models: ModelInfo[];
  currentLocation: LocationInfo;
  currentVariable: VariableInfo;
  forecastBundle: ReplayForecastPoint[];
  blendResult: FullAdaptiveBlendResult;
  probabilisticBlend: ProbabilisticBlendBundle;
  thresholdExceedanceCards: ThresholdExceedanceCard[];
  selectedThresholdResult: ThresholdExceedanceCard;
  brierScores: BrierScoreItem[];
  setSelectedLocation: (id: string) => void;
  setSelectedVariable: (id: string) => void;
  setSelectedLeadTime: (hours: number) => void;
  setSelectedThreshold: (th: number) => void;
  setBlendingStrategy: (strategy: BlendingStrategy) => void;
  toggleModel: (modelId: string) => void;
  setModelEnabled: (modelId: string, enabled: boolean) => void;
  resetAllModels: () => void;
}

const ForecastContext = createContext<ForecastContextType | undefined>(undefined);

export const ForecastProvider = ({ children }: { children: ReactNode }) => {
  const [selectedLocation, setSelectedLocation] = useState<string>('DELHI');
  const [selectedVariable, setSelectedVariable] = useState<string>('rainfall');
  const [selectedLeadTime, setSelectedLeadTime] = useState<number>(24);
  const [selectedThreshold, setSelectedThreshold] = useState<number>(25);
  const [blendingStrategy, setBlendingStrategy] = useState<BlendingStrategy>('adaptive_skill');
  const [modelSwitches, setModelSwitches] = useState<Record<string, boolean>>({
    ncmrwf_ncum: true,
    ncmrwf_neps: true,
    ai_graphcast: true,
  });

  const currentLocation = useMemo(() => {
    return LOCATIONS.find((l) => l.id === selectedLocation) || LOCATIONS[0];
  }, [selectedLocation]);

  const currentVariable = useMemo(() => {
    return VARIABLES.find((v) => v.id === selectedVariable) || VARIABLES[0];
  }, [selectedVariable]);

  const forecastBundle = useMemo(() => {
    return getForecastBundle(selectedLocation, selectedVariable, selectedLeadTime);
  }, [selectedLocation, selectedVariable, selectedLeadTime]);

  const blendResult = useMemo(() => {
    return computeUnifiedBlend(
      forecastBundle,
      modelSwitches,
      blendingStrategy,
      currentLocation.name,
      currentVariable.name
    );
  }, [forecastBundle, modelSwitches, blendingStrategy, currentLocation.name, currentVariable.name]);

  const probabilisticBlend = useMemo(() => {
    return computeProbabilisticBlendEngine(
      blendResult.modelTrusts,
      selectedLocation,
      selectedVariable,
      selectedLeadTime,
      blendingStrategy
    );
  }, [blendResult.modelTrusts, selectedLocation, selectedVariable, selectedLeadTime, blendingStrategy]);

  const thresholdPresets = useMemo(() => {
    return getVariableThresholdPresets(selectedVariable);
  }, [selectedVariable]);

  // Adjust selected threshold if presets changed
  useMemo(() => {
    if (!thresholdPresets.includes(selectedThreshold)) {
      setSelectedThreshold(thresholdPresets[1] || thresholdPresets[0] || 25);
    }
  }, [thresholdPresets]);

  const thresholdExceedanceCards = useMemo(() => {
    const mean = probabilisticBlend.blendedMean ?? 0;
    const sigma = probabilisticBlend.blendedSigma ?? 1;

    return thresholdPresets.map((th) => {
      const p = calculateThresholdProbability(mean, sigma, th);
      return {
        threshold: th,
        unit: currentVariable.unit,
        probability: p.probability,
        probabilityPercent: p.probabilityPercent,
        classification: p.classification,
        predictiveMean: mean,
        predictiveSigma: sigma,
      };
    });
  }, [probabilisticBlend.blendedMean, probabilisticBlend.blendedSigma, thresholdPresets, currentVariable.unit]);

  const selectedThresholdResult = useMemo(() => {
    const mean = probabilisticBlend.blendedMean ?? 0;
    const sigma = probabilisticBlend.blendedSigma ?? 1;
    const p = calculateThresholdProbability(mean, sigma, selectedThreshold);

    return {
      threshold: selectedThreshold,
      unit: currentVariable.unit,
      probability: p.probability,
      probabilityPercent: p.probabilityPercent,
      classification: p.classification,
      predictiveMean: mean,
      predictiveSigma: sigma,
    };
  }, [probabilisticBlend.blendedMean, probabilisticBlend.blendedSigma, selectedThreshold, currentVariable.unit]);

  const brierScores = useMemo(() => {
    const sigma = probabilisticBlend.blendedSigma ?? 1.5;
    return computeBrierScores(
      selectedLocation,
      selectedVariable,
      selectedLeadTime,
      sigma,
      currentVariable.unit
    );
  }, [selectedLocation, selectedVariable, selectedLeadTime, probabilisticBlend.blendedSigma, currentVariable.unit]);

  const toggleModel = (modelId: string) => {
    setModelSwitches((prev) => ({
      ...prev,
      [modelId]: !prev[modelId],
    }));
  };

  const setModelEnabled = (modelId: string, enabled: boolean) => {
    setModelSwitches((prev) => ({
      ...prev,
      [modelId]: enabled,
    }));
  };

  const resetAllModels = () => {
    setModelSwitches({
      ncmrwf_ncum: true,
      ncmrwf_neps: true,
      ai_graphcast: true,
    });
  };

  return (
    <ForecastContext.Provider
      value={{
        selectedLocation,
        selectedVariable,
        selectedLeadTime,
        selectedThreshold,
        blendingStrategy,
        modelSwitches,
        locations: LOCATIONS,
        variables: VARIABLES,
        leadTimes: LEAD_TIMES,
        models: MODELS,
        currentLocation,
        currentVariable,
        forecastBundle,
        blendResult,
        probabilisticBlend,
        thresholdExceedanceCards,
        selectedThresholdResult,
        brierScores,
        setSelectedLocation,
        setSelectedVariable,
        setSelectedLeadTime,
        setSelectedThreshold,
        setBlendingStrategy,
        toggleModel,
        setModelEnabled,
        resetAllModels,
      }}
    >
      {children}
    </ForecastContext.Provider>
  );
};

export const useForecast = (): ForecastContextType => {
  const context = useContext(ForecastContext);
  if (!context) {
    throw new Error('useForecast must be used within a ForecastProvider');
  }
  return context;
};
