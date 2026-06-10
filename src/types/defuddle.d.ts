declare module "defuddle" {
  interface DefuddleResult {
    title?: string;
    description?: string;
    author?: string;
    published?: string;
    image?: string;
    content?: string;
  }

  export class Defuddle {
    constructor(
      dom: any,
      url: string,
      options?: { markdown?: boolean }
    );

    // Allow awaiting directly (thenable)
    then<TResult1 = DefuddleResult, TResult2 = never>(
      onfulfilled?: ((value: DefuddleResult) => TResult1 | PromiseLike<TResult1>) | null | undefined,
      onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined
    ): Promise<TResult1 | TResult2>;
  }
}
