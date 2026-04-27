// Polyfills for older WebViews that pdfjs-dist depends on

if (!(Promise as any).withResolvers) {
  (Promise as any).withResolvers = function () {
    let resolve: any, reject: any;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
  };
}

if (typeof structuredClone !== 'function') {
  (globalThis as any).structuredClone = (obj: any) => {
    if (obj === undefined) return undefined;
    return JSON.parse(JSON.stringify(obj));
  };
}
