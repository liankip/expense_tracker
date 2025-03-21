"use client"
import {useEffect, useState} from 'react';
import {createClient} from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Transaction = {
    id: number;
    amount: number;
    description: string;
    type: 'income' | 'expense';
    created_at: string;
};

type GroupedTransactions = {
    date: string;
    totalIncome: number;
    totalExpense: number;
    transactions: Transaction[];
};

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

export default function Home() {
    const [groupedTransactions, setGroupedTransactions] = useState<GroupedTransactions[]>([]);
    const [amount, setAmount] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [type, setType] = useState<'income' | 'expense'>('income');

    useEffect(() => {
        fetchTransactions();
    }, []);

    async function fetchTransactions() {
        const {data, error} = await supabase.from('transactions').select('*');
        if (error) console.error(error);
        else groupTransactions(data as Transaction[]);
    }

    function groupTransactions(transactions: Transaction[]) {
        const grouped = transactions.reduce((acc: Record<string, GroupedTransactions>, tx) => {
            const date = tx.created_at.split('T')[0];
            if (!acc[date]) {
                acc[date] = {date, totalIncome: 0, totalExpense: 0, transactions: []};
            }
            acc[date].transactions.push(tx);
            if (tx.type === 'income') acc[date].totalIncome += tx.amount;
            else acc[date].totalExpense += tx.amount;
            return acc;
        }, {});
        setGroupedTransactions(Object.values(grouped));
    }

    async function addTransaction() {
        const newTransaction = {amount: Number(amount), description, type, created_at: new Date().toISOString()};
        const {error} = await supabase.from('transactions').insert([newTransaction]).select('*');
        if (error) console.error(error);
        else {
            await fetchTransactions();
            setAmount('');
            setDescription('');
        }
    }

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-2xl font-bold mb-4">Expense Tracker</h1>
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="border p-2 rounded w-full mb-2"
                />
                <input
                    type="number"
                    placeholder="Amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="border p-2 rounded w-full mb-2"
                />
                <select
                    value={type}
                    onChange={(e) => setType(e.target.value as 'income' | 'expense')}
                    className="border p-2 rounded w-full mb-2"
                >
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                </select>
                <button onClick={addTransaction} className="bg-blue-500 text-white p-2 rounded">
                    Add Transaction
                </button>
            </div>
            <h2 className="text-xl font-bold mt-4">Transaction History</h2>
            {groupedTransactions.map(({date, totalIncome, totalExpense, transactions}) => (
                <div key={date} className="border p-4 mb-4 rounded">
                    <h3 className="font-bold text-lg">{date}</h3>
                    <p>Total Income: {formatCurrency(totalIncome)}</p>
                    <p>Total Expense: {formatCurrency(totalExpense)}</p>
                    <p>Total: {formatCurrency(totalIncome - totalExpense)}</p>
                    <ul>
                        {transactions.map((tx) => (
                            <li key={tx.id} className="border p-2 mb-2 rounded">
                                {tx.description} - {formatCurrency(tx.amount)} ({tx.type})
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
}
