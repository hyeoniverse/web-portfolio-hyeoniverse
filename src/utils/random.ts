export const generateRandomElements = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    color: `hsl(${180 + Math.random() * 60}, 70%, 60%)`,
    speed: Math.random() * 0.5 + 0.1,
  }));
};

export const generateRandomDroplets = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 20 + 10,
    opacity: Math.random() * 0.3 + 0.1,
    speed: Math.random() * 0.3 + 0.1,
  }));
};
