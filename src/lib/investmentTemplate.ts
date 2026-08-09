export const INVESTMENT_TEMPLATE_PLACEHOLDERS = [
  '记录今天实际完成的投资理财行动。',
  '记录标的、金额、比例与执行理由。',
  '记录收益之外的风险、情绪与纪律执行情况。',
  '写下下一步可执行的小行动。',
]

export function hasInvestmentTemplatePlaceholders(content: string) {
  return INVESTMENT_TEMPLATE_PLACEHOLDERS.some((placeholder) => content.includes(placeholder))
}
