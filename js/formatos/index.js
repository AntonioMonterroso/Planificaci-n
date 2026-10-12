// Registro de formatos disponibles. Cada formato nuevo se extrae con scripts/extraer_formato.py, se revisa y se registra aquí.
import { FRIR } from './frir.js';

export const FORMATOS = [FRIR];
export const formatoById = (id) => FORMATOS.find((f) => f.id === id) ?? null;
