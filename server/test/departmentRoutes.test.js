import assert from 'node:assert/strict'
import test from 'node:test'
import { createDepartmentRouter } from '../src/modules/departments/departmentRoutes.js'

test('department routes expose the expected methods and relative paths', () => {
  const authenticate = (_request, _response, next) => next()
  const router = createDepartmentRouter({
    authenticate,
    authorize: () => (_request, _response, next) => next(),
  })

  const routes = router.stack.map(({ route }) => ({
    path: route.path,
    method: Object.keys(route.methods).find((method) => route.methods[method]),
  }))

  assert.deepEqual(routes, [
    { method: 'get', path: '/' },
    { method: 'post', path: '/' },
    { method: 'put', path: '/:id' },
    { method: 'delete', path: '/:id' },
  ])
})

test('department route authorization permits reads to both roles and writes to ADMIN only', () => {
  const rolesByRoute = []
  const authenticate = (_request, _response, next) => next()
  const authorize = (...roles) => {
    rolesByRoute.push(roles)
    return (_request, _response, next) => next()
  }

  createDepartmentRouter({ authenticate, authorize })

  assert.deepEqual(rolesByRoute, [
    ['ADMIN', 'EMPLOYEE'],
    ['ADMIN'],
    ['ADMIN'],
    ['ADMIN'],
  ])
})
