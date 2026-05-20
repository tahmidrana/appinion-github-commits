export const mockCommitsPayload = {
  'Alice Johnson': [
    {
      hash: 'aaaaaaa',
      message: 'Add new feature X',
      date: '2025-06-05T10:00:00Z',
      project: 'web-app',
      url: 'https://github.com/example/web-app/commit/aaaaaaa1111111111111111111111111'
    },
    {
      hash: 'bbbbbbb',
      message: 'Fix bug in payment flow',
      date: '2025-06-10T14:30:00Z',
      project: 'web-app',
      url: 'https://github.com/example/web-app/commit/bbbbbbb2222222222222222222222222'
    },
    {
      hash: 'ccccccc',
      message: 'Update dependencies',
      date: '2025-06-12T09:15:00Z',
      project: 'api-server',
      url: 'https://github.com/example/api-server/commit/ccccccc3333333333333333333333333'
    },
    {
      hash: 'ddddddd',
      message: 'Refactor auth module',
      date: '2025-06-18T16:45:00Z',
      project: 'mobile-app',
      url: 'https://github.com/example/mobile-app/commit/ddddddd4444444444444444444444444'
    }
  ],
  'Bob Smith': [
    {
      hash: 'eeeeeee',
      message: 'Improve test coverage',
      date: '2025-06-08T11:00:00Z',
      project: 'web-app',
      url: 'https://github.com/example/web-app/commit/eeeeeee5555555555555555555555555'
    },
    {
      hash: 'fffffff',
      message: 'Add CI workflow',
      date: '2025-06-15T13:20:00Z',
      project: 'api-server',
      url: 'https://github.com/example/api-server/commit/fffffff6666666666666666666666666'
    }
  ],
  'Carol Davis': [
    {
      hash: '1111111',
      message: 'Initial commit for new docs site',
      date: '2025-06-20T08:00:00Z',
      project: 'docs',
      url: 'https://github.com/example/docs/commit/1111111777777777777777777777777'
    }
  ]
}

export const emptyCommitsPayload = {}
