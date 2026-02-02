import { Request, Response } from 'express'
import { io } from '../app'
import { Activity, IActivity } from '../models/activityModel'
import { handleError } from '../utils/errorHandler'
import { queryData } from '../utils/query'

interface Data {
  to: string
  form: Active
}

interface Active {
  staffName: string
  staffUsername: string
  createdAt: Date
  page: string
}

export const createActivity = async (data: Data) => {
  try {
    const form = data.form
    const activity = await Activity.create({
      staffName: form.staffName,
      staffUsername: form.staffUsername,
      page: form.page,
      createdAt: form.createdAt,
    })

    const count = await Activity.countDocuments()
    io.emit(`admin`, {
      activity,
      count,
    })
  } catch (error: any) {
    console.log(error)
  }
}

export const getActivities = async (req: Request, res: Response) => {
  try {
    const result = await queryData<IActivity>(Activity, req)
    res.status(200).json(result)
  } catch (error) {
    handleError(res, undefined, undefined, error)
  }
}
