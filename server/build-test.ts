// Minimal build test to isolate TypeScript compilation issues
console.log('TypeScript compilation test');

interface TestInterface {
  name: string;
  value: number;
}

const test: TestInterface = {
  name: 'test',
  value: 42
};

console.log(test);
