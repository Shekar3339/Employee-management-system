import { LeaveServiceError } from './leaveService.js'

const success = (res, statusCode, message, data) =>
  res.status(statusCode).json({ success: true, message, data })

const error = (res, err) => {
  if (err instanceof LeaveServiceError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    })
  }

  if (err?.name === 'ValidationError' || err?.name === 'CastError') {
    const errors = err.errors
      ? Object.values(err.errors).map((item) => item.message)
      : [err.message]
    return res.status(400).json({ success: false, message: 'Validation failed', errors })
  }

  return res.status(500).json({
    success: false,
    message: 'Something went wrong',
    errors: [],
  })
}

export function createLeaveController(service) {
  return {
    apply: async (req, res) => {
      try {
        const data = await service.apply(req.user, req.body)
        return success(res, 201, 'Leave request submitted successfully', data)
      } catch (err) {
        return error(res, err)
      }
    },

    listMine: async (req, res) => {
      try {
        const data = await service.listMine(req.user)
        return success(res, 200, 'Leave history retrieved successfully', data)
      } catch (err) {
        return error(res, err)
      }
    },

    listAll: async (_req, res) => {
      try {
        const data = await service.listAll()
        return success(res, 200, 'Leave requests retrieved successfully', data)
      } catch (err) {
        return error(res, err)
      }
    },

    review: async (req, res) => {
      try {
        const data = await service.review(req.user, req.params.id, req.body?.status)
        return success(res, 200, 'Leave request status updated successfully', data)
      } catch (err) {
        return error(res, err)
      }
    },
  }
}
