// Fixture for category 8: undersized touch targets on interactive elements
// Expected violation: <button className="h-10">Click</button>
import React from 'react';

export const Button = () => <button className="h-10 w-10 bg-blue-500">Click</button>;
