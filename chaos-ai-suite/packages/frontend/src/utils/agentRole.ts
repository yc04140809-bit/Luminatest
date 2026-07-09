/** 「接遇ガードAI担当」のような肩書きから「AI担当」を落として一言ラベルにする。 */
export function shortRole(title: string): string {
  return title.replace(/AI担当$/, "");
}
