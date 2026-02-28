# React Basics

React is a JavaScript library for building user interfaces, developed by Meta (formerly Facebook) and open-sourced in 2013. Its core idea is simple: describe what your UI should look like for a given state, and let React figure out how to update the DOM efficiently. This declarative model, combined with a component-based architecture, has made React one of the most widely adopted frontend libraries in the world.

## Components: The Building Blocks

Everything in React is a **component**, a reusable, self-contained piece of UI.

Modern React is written using *function components*:

```jsx
function Greeting({ name }) {
  return <h1>Hello, {name}!</h1>;
}
```

This component accepts a `name` prop and returns JSX (JavaScript XML),a syntax extension that looks like HTML but compiles to regular JavaScript. Components can be composed together to build complex interfaces from simple, focused pieces.

```jsx
function App() {
  return (
    <div>
      <Greeting name="Alice" />
      <Greeting name="Bob" />
    </div>
  );
}
```

> UI is a function of state, and components are the unit of composition.

## Props: Passing Data Down

**Props** (short for properties) are how you pass data from a parent component to a child. They are read-only, meaning a component should never modify its own props.

```jsx
function UserCard({ username, avatarUrl, bio }) {
  return (
    <div className="card">
      <img src={avatarUrl} alt={username} />
      <h2>{username}</h2>
      <p>{bio}</p>
    </div>
  );
}
```

Props can be any JavaScript value: strings, numbers, booleans, objects, arrays, or even other components and functions.

## State: Making Components Interactive

While props flow down from parent to child, **state** is local data managed *inside* a component. When state changes, React re-renders the component to reflect the new UI. The `useState` hook is the primary way to add state to a function component:

```jsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <button onClick={() => setCount(count - 1)}>Decrement</button>
    </div>
  );
}
```

`useState` returns a tuple with two values: the current value and a setter function. Calling the setter triggers a re-render with the new value. React batches multiple state updates together for performance.

## The useEffect Hook

`useEffect` lets you perform side effects — data fetching, subscriptions, DOM manipulation — after the component renders:

```jsx
import { useState, useEffect } from 'react';

function UserProfile({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => setUser(data));
  }, [userId]); // re-run whenever userId changes

  if (!user) return <p>Loading...</p>;
  return <h2>{user.name}</h2>;
}
```

The second argument, the **dependency array**, controls when the effect re-runs. An empty array (`[]`) means run once after the first render. Omitting it means run after every render.

## Lifting State Up

When multiple components need to share the same state, you **lift state up** to their closest common ancestor and pass it down via props:

```jsx
function Parent() {
  const [value, setValue] = useState('');

  return (
    <>
      <Input value={value} onChange={setValue} />
      <Preview text={value} />
    </>
  );
}
```

This pattern, in which a parent component acts as the single source of truth, keeps components predictable and avoids synchronization bugs between siblings.

## Keys and Lists

When rendering a list of elements, React needs a stable **key** prop to track which items changed, were added, or removed:

```jsx
function TodoList({ items }) {
  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>{item.text}</li>
      ))}
    </ul>
  );
}
```

Keys should be unique among siblings and stable across renders. Avoid using array indices as keys if the list can be reordered.

## What Comes Next

From here, common next topics include:

- **Context API** for sharing state across deeply nested components
- **useReducer** for more complex state logic
- **Custom hooks** for sharing stateful logic between components
- **React Router** for client-side navigation
- **Server components (& Next.js)** for server-side rendering with zero client-side JS
