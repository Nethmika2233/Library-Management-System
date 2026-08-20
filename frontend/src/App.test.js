import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

test('renders the library management dashboard', () => {
  render(<App />);
  expect(screen.getByText(/good morning, librarian/i)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /book catalogue/i })).toBeInTheDocument();
});

test('sidebar navigation updates the active destination', () => {
  render(<App />);
  const insightsButton = screen.getByRole('button', { name: /library insights/i });

  fireEvent.click(insightsButton);

  expect(insightsButton).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('button', { name: /^overview$/i })).not.toHaveAttribute('aria-current', 'page');
});

test('renders the requested content for each active tab', () => {
  render(<App />);

  expect(screen.getByText('Total titles')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /book catalogue/i })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /book catalogue/i }));
  expect(screen.queryByText('Total titles')).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /book catalogue/i })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /library insights/i }));
  expect(screen.getByText('Total titles')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: /book catalogue/i })).not.toBeInTheDocument();
});

test('stat cards update the selected detail view', () => {
  render(<App />);

  const titlesCard = screen.getByRole('button', { name: /total titles/i });
  const availableCard = screen.getByRole('button', { name: /available titles/i });
  const copiesCard = screen.getByRole('button', { name: /total copies/i });

  expect(titlesCard).toHaveAttribute('aria-pressed', 'true');
  expect(screen.queryByRole('heading', { name: /category breakdown/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: /inventory summary/i })).not.toBeInTheDocument();

  fireEvent.click(availableCard);
  expect(availableCard).toHaveAttribute('aria-pressed', 'true');
  expect(titlesCard).toHaveAttribute('aria-pressed', 'false');

  fireEvent.click(copiesCard);
  expect(copiesCard).toHaveAttribute('aria-pressed', 'true');
});
