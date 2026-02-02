import { Request, Response } from 'express'
import { queryData, search } from '../utils/query'
import { uploadFilesToS3 } from '../utils/fileUpload'
import { handleError } from '../utils/errorHandler'
import { Expense, IExpense } from '../models/expenseModel'

export const createExpense = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const uploadedFiles = await uploadFilesToS3(req)
    uploadedFiles.forEach((file) => {
      req.body[file.fieldName] = file.s3Url
    })

    await Expense.create(req.body)
    const result = await queryData<IExpense>(Expense, req)
    res.status(200).json({
      message: 'Expense was created successfully',
      result,
    })
  } catch (error: any) {
    handleError(res, undefined, undefined, error)
  }
}

export const getExpense = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  try {
    const expense = await Expense.findById(req.params.id)
    if (!expense) {
      return res.status(404).json({ message: 'expense not found' })
    }

    res.status(200).json({ data: expense })
  } catch (error) {
    console.log(error)
    handleError(res, undefined, undefined, error)
  }
}

export const updateExpense = async (req: Request, res: Response) => {
  try {
    const uploadedFiles = await uploadFilesToS3(req)
    uploadedFiles.forEach((file) => {
      req.body[file.fieldName] = file.s3Url
    })

    const expense = await Expense.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
    if (!expense) {
      return res.status(404).json({ message: 'expense not found' })
    }
    const result = await queryData<IExpense>(Expense, req)

    res.status(200).json({
      message: 'The expense is updated successfully',
      result,
    })
  } catch (error) {
    handleError(res, undefined, undefined, error)
  }
}

export const getExpenses = async (req: Request, res: Response) => {
  try {
    const result = await queryData<IExpense>(Expense, req)
    res.status(200).json(result)
  } catch (error) {
    handleError(res, undefined, undefined, error)
  }
}
