import { useEffect, useState } from "react";
import { PanResponder } from "react-native";
import { TripValidationResult } from "@/utils/tripValidation";

const MIN_VALUE = 50;
const MAX_VALUE_ABSOLUTE = 50000;

/**
 * Hook de formulario para el presupuesto del viaje: rangos mínimo/máximo, nivel de gasto y slider interactivo.
 * @param validationResult - Resultado de validación del viaje con estimaciones de presupuesto
 * @param step - Paso actual del wizard
 * @returns Estado del presupuesto, controles del slider, handlers de input y función de reset
 */
export function useTripBudgetForm(
  validationResult: TripValidationResult | null,
  step: number,
) {
  const [minBudget, setMinBudget] = useState(80);
  const [maxBudget, setMaxBudget] = useState(1000);
  const [minBudgetInput, setMinBudgetInput] = useState("80");
  const [maxBudgetInput, setMaxBudgetInput] = useState("1000");
  const [spendingLevel, setSpendingLevel] = useState<
    "saver" | "balanced" | "luxury"
  >("balanced");
  const [budgetManuallyModified, setBudgetManuallyModified] = useState(false);
  const [sliderWidth, setSliderWidth] = useState(0);

  const sliderMaxValue = Math.max(
    1000,
    Math.min(maxBudget + 100, MAX_VALUE_ABSOLUTE),
  );

  useEffect(() => {
    setMinBudgetInput(minBudget.toString());
  }, [minBudget]);
  useEffect(() => {
    setMaxBudgetInput(maxBudget.toString());
  }, [maxBudget]);

  const SPENDING_MULTIPLIER: Record<string, { min: number; max: number }> = {
    saver: { min: 0.6, max: 0.85 },
    balanced: { min: 1.0, max: 1.0 },
    luxury: { min: 1.5, max: 1.8 },
  };

  // Auto-apply recommended budget when reaching step 5 and user hasn't manually set it.
  // Spending level scales the base estimate.
  useEffect(() => {
    if (validationResult?.budgetEst && step === 5 && !budgetManuallyModified) {
      const mult = SPENDING_MULTIPLIER[spendingLevel] || SPENDING_MULTIPLIER.balanced;
      setMinBudget(
        Math.round(validationResult.budgetEst.estimate_min * mult.min / 10) * 10,
      );
      setMaxBudget(
        Math.round(validationResult.budgetEst.estimate_max * mult.max / 10) * 10,
      );
    }
  }, [validationResult?.budgetEst, step, budgetManuallyModified, spendingLevel]);

  // Reset manual flag when spending level changes so new estimates auto-apply
  useEffect(() => {
    setBudgetManuallyModified(false);
  }, [spendingLevel]);

  const getPositionFromValue = (value: number) => {
    if (sliderWidth === 0) return 0;
    return ((value - MIN_VALUE) / (sliderMaxValue - MIN_VALUE)) * sliderWidth;
  };

  const getValueFromPosition = (position: number) => {
    if (sliderWidth === 0) return MIN_VALUE;
    const raw =
      (position / sliderWidth) * (sliderMaxValue - MIN_VALUE) + MIN_VALUE;
    return Math.max(
      MIN_VALUE,
      Math.min(sliderMaxValue, Math.round(raw / 10) * 10),
    );
  };

  const handleMinBudgetInputChange = (text: string) => {
    setMinBudgetInput(text);
    const value = parseInt(text);
    if (!isNaN(value) && value >= MIN_VALUE && value < maxBudget) {
      setMinBudget(value);
      setBudgetManuallyModified(true);
    }
  };

  const handleMaxBudgetInputChange = (text: string) => {
    setMaxBudgetInput(text);
    const value = parseInt(text);
    if (!isNaN(value) && value > minBudget && value <= MAX_VALUE_ABSOLUTE) {
      setMaxBudget(value);
      setBudgetManuallyModified(true);
    }
  };

  const handleMinBudgetBlur = () => {
    const value = parseInt(minBudgetInput);
    if (isNaN(value) || value < MIN_VALUE || value >= maxBudget) {
      setMinBudgetInput(minBudget.toString());
    }
  };

  const handleMaxBudgetBlur = () => {
    const value = parseInt(maxBudgetInput);
    if (isNaN(value) || value <= minBudget || value > MAX_VALUE_ABSOLUTE) {
      setMaxBudgetInput(maxBudget.toString());
    }
  };

  // PanResponders capture the latest budget values via closure on each render
  const minPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gestureState) => {
      const newValue = getValueFromPosition(
        getPositionFromValue(minBudget) + gestureState.dx,
      );
      if (newValue < maxBudget - 50) {
        setMinBudget(newValue);
        setBudgetManuallyModified(true);
      }
    },
  });

  const maxPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gestureState) => {
      const newValue = getValueFromPosition(
        getPositionFromValue(maxBudget) + gestureState.dx,
      );
      if (newValue > minBudget + 50) {
        setMaxBudget(newValue);
        setBudgetManuallyModified(true);
      }
    },
  });

  const reset = () => {
    setMinBudget(80);
    setMaxBudget(1000);
    setMinBudgetInput("80");
    setMaxBudgetInput("1000");
    setSpendingLevel("balanced");
    setBudgetManuallyModified(false);
  };

  return {
    minBudget,
    setMinBudget,
    maxBudget,
    setMaxBudget,
    minBudgetInput,
    maxBudgetInput,
    spendingLevel,
    setSpendingLevel,
    budgetManuallyModified,
    setBudgetManuallyModified,
    sliderWidth,
    setSliderWidth,
    sliderMaxValue,
    getPositionFromValue,
    handleMinBudgetInputChange,
    handleMaxBudgetInputChange,
    handleMinBudgetBlur,
    handleMaxBudgetBlur,
    minPanResponder,
    maxPanResponder,
    reset,
  };
}
