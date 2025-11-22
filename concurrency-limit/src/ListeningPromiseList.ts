
export class ListeningPromiseList {
    private resolveFunctions: (() => void)[] = [];  
    
    addPromise() {
      const promise = new Promise<void>((resolve) => {
        this.resolveFunctions.push(resolve);
      });
      return promise;
    }
    
    resolveAll() {
      const fns = this.resolveFunctions;
      this.resolveFunctions = [];
      for (const fn of fns) {
        fn();
      }
    }
  }