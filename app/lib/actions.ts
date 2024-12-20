'use server';

import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

// Zod を使ったフォームのバリデーション定義
const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer.....'
  }),
  amount: z.coerce
    .number()
    .gt(0, { message: 'Please enter an amount greater than $0.....' }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status.....',
  }),
  date: z.string(),
})

// フォームのバリデーション定義から、新規作成と更新用のスキーマを作成
const CreateInvoice = FormSchema.omit({ id: true, date: true });
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.....';
        default:
          return 'Something went wrong.....';
      }
    }
    throw error;
  }
}

export async function createInvoice(prevState: State, formData: FormData) {
  // Zod を使ったバリデーション
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  // フォームのバリデーションが失敗していたらエラーを返す
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    };
  }
  
  // insert するデータを用意
  const { customerId, amount, status } = validatedFields.data
  /** 浮動小数点の誤差を避けるため
   * @example
   * $10.50 を保存する場合
   * 通常の方法 -> 10.50（浮動小数点数として保存）
   * セント単位 -> 1050（整数として保存）
  */
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];
  
  try {
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
  } catch (error) {
    return { message: `Database Error: Failed to Create Invoice. -> ${error}` };
  }

  // DBへの insert が成功したら、請求書一覧ページのキャッシュを再検証し一覧ページにリダイレクトする
  revalidatePath('/dashboard/invocies');
  redirect('/dashboard/invoices');
}

export async function updateInvoice(id: string, prevState: State, formData: FormData) {
  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Update Invoice.',
    };
  }
 
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
 
  try {
    await sql`
      UPDATE invoices
      SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
      WHERE id = ${id}
    `; 
  } catch (error) {
    return { message: `Database Error: Failed to Update Invoice. -> ${error}` };
  }
 
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
  try {
    await sql`DELETE FROM invoices WHERE id = ${id}`;    
    revalidatePath('/dashboard/invoices');
    return { message: 'Deleted Invoice.' };
  } catch (error) {
    return { message: `Database Error: Failed to Delete Invoice. -> ${error}` }    
  }
}