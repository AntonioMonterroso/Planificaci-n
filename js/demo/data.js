// Datos 100 % SINTÉTICOS para demostración y pruebas. No son de ningún cliente.
// Estructura equivalente a la del Excel de Caja y Bancos (centralizadora > sumaria > analíticas > subanalíticas).

export function demoData() {
  return {
    header: {
      entity: 'Cliente Demo, S.A.',
      title: 'Auditoría de Estados Financieros',
      period: '1 de enero al 31 de diciembre de 2025',
      currency: 'Quetzales',
    },
    papers: [
      {
        ref: 'BG', kind: 'centralizadora', title: 'Estado de Situación Financiera (centralizadora)',
        signoffs: { elaboro: 'u-campo', reviso: 'u-super', autorizo: 'u-gerente' },
        lines: [
          { key: 'A', code: 'A', label: 'Caja y bancos', link: 'A', section: 'activo' },
          { key: 'B', code: 'B', label: 'Cuentas por cobrar', contab: 80000, source: 'Balanza de comprobación', section: 'activo' },
          { key: 'C', code: 'C', label: 'Inventarios', contab: 120000, source: 'Balanza de comprobación', section: 'activo' },
          { key: 'D', code: 'D', label: 'Propiedad, planta y equipo', contab: 400000, source: 'Balanza de comprobación', section: 'activo' },
          { key: 'AA', code: 'AA', label: 'Cuentas por pagar', contab: 95000, source: 'Balanza de comprobación', section: 'pasivo' },
          { key: 'BB', code: 'BB', label: 'Patrimonio', contab: 703500.5, source: 'Balanza de comprobación', section: 'patrimonio' },
        ],
      },
      {
        ref: 'A', kind: 'sumaria', parent: 'BG', title: 'Sumaria de Caja y Bancos', nature: 'deudora',
        signoffs: { elaboro: 'u-campo', reviso: 'u-super', autorizo: 'u-gerente' },
        lines: [
          { key: 'caja', code: '1', label: 'Caja', link: 'A1' },
          { key: 'bancos', code: '2', label: 'Bancos moneda local', link: 'A2' },
        ],
      },
      {
        ref: 'A1', kind: 'analitica', parent: 'A', title: 'Analítica de Caja', nature: 'deudora',
        signoffs: { elaboro: 'u-campo', reviso: 'u-super', autorizo: 'u-gerente' },
        lines: [
          { key: 'general', code: '111001', label: 'Caja general (efectivo por depositar)', link: 'A1-1' },
          { key: 'chica', code: '111002', label: 'Caja chica', link: 'A1-2' },
        ],
      },
      {
        ref: 'A1-1', kind: 'subanalitica', parent: 'A1', title: 'Subanalítica de Caja general', nature: 'deudora',
        signoffs: { elaboro: 'u-aux', reviso: 'u-campo' },
        lines: [
          { key: 'efectivo', code: '1', label: 'Efectivo contado en arqueo', contab: 12450, source: 'Arqueo 31/12/2025' },
          { key: 'cheques', code: '2', label: 'Cheques pendientes de depositar', contab: '=1200+850.5', source: 'Relación de cheques' },
          { key: 'vales', code: '3', label: 'Vales pendientes de comprobar', contab: 300, source: 'Vales No. 14' },
        ],
      },
      {
        ref: 'A1-2', kind: 'subanalitica', parent: 'A1', title: 'Subanalítica de Caja chica', nature: 'deudora',
        signoffs: { elaboro: 'u-aux', reviso: 'u-campo' },
        lines: [{ key: 'fondo', code: '1', label: 'Fondo de caja chica', contab: 5000, source: 'Acta de apertura del fondo' }],
      },
      {
        ref: 'A2', kind: 'analitica', parent: 'A', title: 'Analítica de Bancos', nature: 'deudora',
        signoffs: { elaboro: 'u-campo', reviso: 'u-super', autorizo: 'u-gerente' },
        lines: [
          { key: 'banco1', code: '211001', label: 'Banco Uno, cuenta monetaria', link: 'A2-1' },
          { key: 'banco2', code: '211002', label: 'Banco Dos, cuenta de ahorro', contab: 36200, source: 'Estado de cuenta diciembre' },
        ],
      },
      {
        ref: 'A2-1', kind: 'subanalitica', parent: 'A2', title: 'Conciliación bancaria · Banco Uno', nature: 'deudora',
        signoffs: { elaboro: 'u-aux', reviso: 'u-campo' },
        lines: [
          { key: 'estado', code: '1', label: 'Saldo según estado de cuenta', contab: 150000, source: 'Estado de cuenta diciembre' },
          { key: 'circulacion', code: '2', label: '(–) Cheques en circulación', contab: -12000, source: 'Relación de cheques' },
          { key: 'transito', code: '3', label: '(+) Depósitos en tránsito', contab: '=3000+1500', source: 'Boletas de depósito' },
        ],
      },
    ],
    adjustments: [
      {
        id: 'AJ-1', date: '2025-12-31', memo: 'Reclasificar vales pendientes de comprobar a cuentas por cobrar',
        entries: [
          { ref: 'BG', key: 'B', side: 'debe', amount: 300 },
          { ref: 'A1-1', key: 'vales', side: 'haber', amount: 300 },
        ],
      },
    ],
  };
}
