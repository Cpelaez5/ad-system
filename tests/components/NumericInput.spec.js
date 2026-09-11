import { describe, it, expect, vi } from 'vitest';
import NumericInput from '@/components/common/NumericInput.vue';

describe('NumericInput Component', () => {
  it('preserva el búfer local al escribir ceros iniciales en decimales (ej: 0.05)', () => {
    const emitted = [];
    const vm = {
      isFocused: true,
      localRaw: '',
      allowDecimals: true,
      maxDecimals: 2,
      min: undefined,
      max: undefined,
      $emit: (event, val) => emitted.push({ event, val })
    };

    // 1. Usuario escribe '0.'
    NumericInput.methods.onInput.call(vm, { target: { value: '0.' } });
    expect(vm.localRaw).toBe('0.');
    expect(NumericInput.computed.displayValue.call(vm)).toBe('0.');

    // 2. Usuario escribe '0.0' -> Antes esto se borraba con v-model.number
    NumericInput.methods.onInput.call(vm, { target: { value: '0.0' } });
    expect(vm.localRaw).toBe('0.0');
    expect(NumericInput.computed.displayValue.call(vm)).toBe('0.0');

    // 3. Usuario escribe '0.05'
    NumericInput.methods.onInput.call(vm, { target: { value: '0.05' } });
    expect(vm.localRaw).toBe('0.05');
    expect(NumericInput.computed.displayValue.call(vm)).toBe('0.05');
    expect(emitted[emitted.length - 1]).toEqual({ event: 'update:modelValue', val: 0.05 });
  });

  it('preserva el búfer al escribir decimales con cero intermedio (ej: 12.0 -> 12.08)', () => {
    const emitted = [];
    const vm = {
      isFocused: true,
      localRaw: '',
      allowDecimals: true,
      maxDecimals: 2,
      $emit: (event, val) => emitted.push({ event, val })
    };

    // Escribe '12.0'
    NumericInput.methods.onInput.call(vm, { target: { value: '12.0' } });
    expect(vm.localRaw).toBe('12.0');
    expect(NumericInput.computed.displayValue.call(vm)).toBe('12.0');

    // Escribe '12.08'
    NumericInput.methods.onInput.call(vm, { target: { value: '12.08' } });
    expect(vm.localRaw).toBe('12.08');
    expect(emitted[emitted.length - 1]).toEqual({ event: 'update:modelValue', val: 12.08 });
  });

  it('convierte comas en puntos para compatibilidad con teclado numérico venezolano (12,50 -> 12.50)', () => {
    const emitted = [];
    const vm = {
      isFocused: true,
      localRaw: '',
      allowDecimals: true,
      maxDecimals: 2,
      $emit: (event, val) => emitted.push({ event, val })
    };

    NumericInput.methods.onInput.call(vm, { target: { value: '12,50' } });
    expect(vm.localRaw).toBe('12.50');
    expect(emitted[emitted.length - 1]).toEqual({ event: 'update:modelValue', val: 12.5 });
  });

  it('restringe la cantidad de decimales según maxDecimals', () => {
    const emitted = [];
    const vm = {
      isFocused: true,
      localRaw: '',
      allowDecimals: true,
      maxDecimals: 2,
      $emit: (event, val) => emitted.push({ event, val })
    };

    NumericInput.methods.onInput.call(vm, { target: { value: '10.5559' } });
    expect(vm.localRaw).toBe('10.55');
    expect(emitted[emitted.length - 1]).toEqual({ event: 'update:modelValue', val: 10.55 });
  });

  it('normaliza el valor en onBlur y limpia caracteres extraños', () => {
    const emitted = [];
    const vm = {
      isFocused: true,
      localRaw: '45.',
      modelValue: 45,
      $emit: (event, val) => emitted.push({ event, val })
    };

    NumericInput.methods.onBlur.call(vm, {});
    expect(vm.isFocused).toBe(false);
    expect(vm.localRaw).toBe('45');
    expect(emitted).toContainEqual({ event: 'update:modelValue', val: 45 });
  });
});
