"use client"
import {useEffect, useRef, useState} from 'react';
import {createClient} from '@supabase/supabase-js';
import {z} from 'zod';

const supabase = createClient(
    'https://rduiuqfptvqkzucxulsx.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkdWl1cWZwdHZxa3p1Y3h1bHN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzOTI3NTMsImV4cCI6MjA1Nzk2ODc1M30.Buksbm_h1FhQDKjYRfJ9-rFI2sBnDfCXT_IV5mo6-4Q'
);

const transactionSchema = z.object({
    amount: z.string().regex(/^\d+$/, 'Amount must be a valid number').min(1, 'Amount is required'),
    description: z.string().min(1, 'Description is required'),
    type: z.enum(['income', 'expense']),
});

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
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        fetchTransactions();
    }, []);

    async function fetchTransactions() {
        const {data, error} = await supabase.from('transactions').select('*').order('created_at', {ascending: false});
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
        setErrors({});
        const result = transactionSchema.safeParse({ amount, description, type });

        if (!result.success) {
            const validationErrors = result.error.format();
            const formattedErrors: { [key: string]: string } = {};

            if (validationErrors.amount?._errors) {
                formattedErrors.amount = validationErrors.amount._errors[0];
            }
            if (validationErrors.description?._errors) {
                formattedErrors.description = validationErrors.description._errors[0];
            }

            setErrors(formattedErrors);
            return;
        }

        setIsLoading(true);
        const newTransaction = {amount: Number(amount), description, type, created_at: new Date().toISOString()};
        const {error} = await supabase.from('transactions').insert([newTransaction]).select('*');
        if (error) console.error(error);
        else {
            await fetchTransactions();
            setAmount('');
            setDescription('');
        }
        setIsLoading(false);
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
                    className={`border p-2 rounded w-full mb-2 ${errors.description ? 'border-red-500' : ''}`}
                />
                {errors.description && <p className="text-red-500 text-sm">{errors.description}</p>}
                <input
                    type="number"
                    placeholder="Amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={`border p-2 rounded w-full mb-2 ${errors.amount ? 'border-red-500' : ''}`}
                />
                {errors.amount && <p className="text-red-500 text-sm">{errors.amount}</p>}
                <select
                    value={type}
                    onChange={(e) => setType(e.target.value as 'income' | 'expense')}
                    className="border p-2 rounded w-full mb-2"
                >
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                </select>
                <button
                    onClick={addTransaction}
                    className={`bg-blue-500 text-white p-2 rounded ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={isLoading}
                >
                    {isLoading ? 'Saving...' : 'Add Transaction'}
                </button>
            </div>
            <h2 className="text-xl font-bold mt-4">Transaction History</h2>

            {groupedTransactions.map(({ date, totalIncome, totalExpense, transactions }) => (
                <div key={date} className="border p-4 mb-4 rounded">
                    <h3 className="font-bold text-lg">{date}</h3>
                    <p>Total Income: {formatCurrency(totalIncome)}</p>
                    <p>Total Expense: {formatCurrency(totalExpense)}</p>
                    <p>Total: {formatCurrency(totalIncome - totalExpense)}</p>
                    <ul>
                        {transactions.map((tx) => (
                            <li key={tx.id} className="border p-2 mb-2 rounded">
                                {tx.description} - {formatCurrency(tx.amount)} <span
                                className={tx.type == 'income' ? "text-green-600" : "text-red-600"}>({tx.type})</span>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
}
