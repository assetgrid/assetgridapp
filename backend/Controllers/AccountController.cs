﻿using assetgrid_backend.Data;
using assetgrid_backend.Helpers;
using assetgrid_backend.Models;
using assetgrid_backend.ViewModels;
using assetgrid_backend.Services;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Globalization;
using static Microsoft.EntityFrameworkCore.DbLoggerCategory;
using assetgrid_backend.Data.Search;
using assetgrid_backend.models.Search;

namespace assetgrid_backend.Controllers
{
    [ApiController]
    [Authorize]
    [Route("/api/v1/[controller]")]
    public class AccountController : Controller
    {
        private readonly AssetgridDbContext _context;
        private readonly IUserService _user;
        private readonly IAccountService _account;
        private readonly IOptions<ApiBehaviorOptions> _apiBehaviorOptions;

        public AccountController(
            AssetgridDbContext context,
            IUserService userService,
            IAccountService accountService,
            IOptions<ApiBehaviorOptions> apiBehaviorOptions)
        {
            _context = context;
            _user = userService;
            _account = accountService;
            _apiBehaviorOptions = apiBehaviorOptions;
        }

        /// <summary>
        /// Creates a new account
        /// </summary>
        /// <param name="model">The account to be created</param>
        /// <returns>The newly created account</returns>
        [HttpPost()]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(ViewAccount))]
        public async Task<IActionResult> Create(ViewCreateAccount model)
        {
            var user = _user.GetCurrent(HttpContext)!;
            if (ModelState.IsValid)
            {
                using (var transaction = _context.Database.BeginTransaction())
                {
                    var result = new Account
                    {
                        Name = model.Name,
                        Description = model.Description,
                        Identifiers = model.Identifiers.Select(x => new AccountUniqueIdentifier
                        {
                            Identifier = x
                        }).ToList()
                    };
                    _context.Accounts.Add(result);
                    await _context.SaveChangesAsync();

                    var userAccount = new UserAccount
                    {
                        AccountId = result.Id,
                        Favorite = model.Favorite,
                        IncludeInNetWorth = model.IncludeInNetWorth,
                        Permissions = UserAccountPermissions.All,
                        UserId = user.Id,
                    };
                    _context.UserAccounts.Add(userAccount);
                    await _context.SaveChangesAsync();

                    transaction.Commit();

                    return Ok(new ViewAccount(
                        id: result.Id,
                        identifiers: result.Identifiers.Select(x => x.Identifier).ToList(),
                        description: result.Description,
                        name: result.Name,
                        favorite: model.Favorite,
                        includeInNetWorth: model.IncludeInNetWorth,
                        balance: 0,
                        permissions: ViewAccount.AccountPermissions.All
                    ));
                }
            }
            return _apiBehaviorOptions.Value?.InvalidModelStateResponseFactory(ControllerContext) ?? BadRequest();
        }

        [HttpGet()]
        [Route("/api/v1/[controller]/{id}")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(ViewAccount))]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Get(int id)
        {
            var user = _user.GetCurrent(HttpContext)!;
            var result = await _context.UserAccounts
                .Where(account => account.UserId == user.Id && account.AccountId == id)
                .SelectView()
                .SingleOrDefaultAsync();

            if (result == null) return NotFound();

            var balance = await _context.Transactions
                .Where(transaction => transaction.SourceAccountId == id || transaction.DestinationAccountId == id)
                .Select(transaction => transaction.DestinationAccountId == id ? transaction.Total : -transaction.Total)
                .SumAsync();

            result.Balance = balance;

            return Ok(result);
        }

        [HttpPut()]
        [Route("/api/v1/[controller]/{id}")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(ViewAccount))]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Update(int id, ViewAccount model)
        {
            var user = _user.GetCurrent(HttpContext)!;
            var result = await _context.UserAccounts
                .Include(account => account.Account)
                .SingleOrDefaultAsync(account => account.UserId == user.Id && account.AccountId == id);

            if (result == null)
            {
                return NotFound();
            }
            if (result.Permissions != UserAccountPermissions.All)
            {
                return Forbid();
            }

            _context.AccountUniqueIdentifiers.RemoveRange(_context.AccountUniqueIdentifiers.Where(x => x.AccountId == id));
            result.Account.Identifiers = model.Identifiers.Select(x => new AccountUniqueIdentifier
            {
                Identifier = x
            }).ToList();
            result.Account.Description = model.Description;
            result.Account.Name = model.Name;
            result.Favorite = model.Favorite;
            result.IncludeInNetWorth = model.IncludeInNetWorth;

            await _context.SaveChangesAsync();

            return Ok(new ViewAccount(
                id: result.Id,
                name: result.Account.Name,
                description: result.Account.Description,
                identifiers: result.Account.Identifiers.Select(x => x.Identifier).ToList(),
                favorite: result.Favorite,
                includeInNetWorth: result.IncludeInNetWorth,
                permissions: ViewAccount.PermissionsFromDbPermissions(result.Permissions),
                balance: 0
            ));
        }

        [HttpDelete()]
        [Route("/api/v1/[controller]/{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Delete(int id)
        {
            var user = _user.GetCurrent(HttpContext)!;
            using (var transaction = _context.Database.BeginTransaction())
            {
                var permissions = await _context.UserAccounts
                    .Where(account => account.AccountId == id && account.UserId == user.Id)
                    .Select(account => (UserAccountPermissions?)account.Permissions)
                    .SingleOrDefaultAsync();

                if (permissions == null)
                {
                    return NotFound();
                }
                if (permissions != UserAccountPermissions.All)
                {
                    return Forbid();
                }

                await _account.Delete(id);

                transaction.Commit();

                return Ok();
            }
        }

        [HttpPost()]
        [Route("/api/v1/[controller]/[action]")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(ViewSearchResponse<ViewAccount>))]
        public async Task<IActionResult> Search(ViewSearch query)
        {
            var user = _user.GetCurrent(HttpContext)!;
            var result = await _context.UserAccounts
                .Where(account => account.UserId == user.Id)
                .ApplySearch(query, true)
                .Skip(query.From)
                .Take(query.To - query.From)
                .SelectView()
                .ToListAsync();

            return Ok(new ViewSearchResponse<ViewAccount>
            {
                Data = result,
                TotalItems = await _context.UserAccounts
                    .Where(account => account.UserId == user.Id)
                    .ApplySearch(query, false).CountAsync()
            });
        }

        [HttpPost()]
        [Route("/api/v1/[controller]/{id}/[action]")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(ViewTransactionList))]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Transactions(int id, ViewTransactionListRequest request)
        {
            var user = _user.GetCurrent(HttpContext)!;
            if (! await _context.UserAccounts.AnyAsync(account => account.UserId == user.Id && account.AccountId == id))
            {
                return NotFound();
            }

            var query = _context.Transactions
                .Where(transaction => transaction.SourceAccountId == id || transaction.DestinationAccountId == id);

            if (request.Query != null)
            {
                query = query.ApplySearch(request.Query);
            }

            if (request.Descending)
            {
                query = query.OrderByDescending(transaction => transaction.DateTime)
                    .ThenByDescending(transaction => transaction.Id);
            }
            else
            {
                query = query.OrderBy(transaction => transaction.DateTime)
                    .ThenBy(transaction => transaction.Id);
            }

            var test = query
                .Skip(request.From)
                .Take(request.To - request.From)
                .SelectView(user.Id)
                .ToList();

            var result = await query
                .Skip(request.From)
                .Take(request.To - request.From)
                .SelectView(user.Id)
                .ToListAsync();
            var firstTransaction = result
                .OrderBy(transaction => transaction.DateTime)
                .ThenBy(transaction => transaction.Id)
                .FirstOrDefault();
            var total = firstTransaction == null ? 0 : await query
                .Where(transaction => transaction.DateTime < firstTransaction.DateTime || (transaction.DateTime == firstTransaction.DateTime && transaction.Id < firstTransaction.Id))
                .Select(transaction => transaction.Total * (transaction.DestinationAccountId == id ? 1 : -1))
                .SumAsync();

            return Ok(new ViewTransactionList
            {
                Data = result,
                TotalItems = await query.CountAsync(),
                Total = total,
            });
        }

        /// <summary>
        /// Same as the method to search transactions, but only returns the count.
        /// Used to figure out which page is the last without requesting any page
        /// </summary>
        [HttpPost()]
        [Route("/api/v1/[controller]/{id}/[action]")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(int))]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> CountTransactions(int id, SearchGroup? requestQuery)
        {
            var user = _user.GetCurrent(HttpContext)!;
            if (! await _context.UserAccounts.AnyAsync(account => account.UserId == user.Id && account.AccountId == id))
            {
                return NotFound();
            }

            var query = _context.Transactions
                .Where(transaction => transaction.SourceAccountId == id || transaction.DestinationAccountId == id);

            if (requestQuery != null)
            {
                query = query.ApplySearch(requestQuery);
            }

            return Ok(await query.CountAsync());
        }

        #region Movements

        struct AccountMovementGroup
        {
            public int AccountId { get; set; }
            public DateTime TimePoint { get; set; }
            public string Type { get; set; }
            public long Total { get; set; }
        }

        struct MovementItem
        {
            public int AccountId { get; set; }
            public string Type { get; set; }
            public Transaction Transaction { get; set; }
        }

        /// <summary>
        /// Returns revenue and expenses for a specific account grouped in intervals
        /// </summary>
        /// <param name="id">The account to get the balance for</param>
        /// <param name="request">An object representing the period and the interval to group by</param>
        /// <returns>The initial balance as well as a list of revenue and expenses for each interval</returns>
        [HttpPost()]
        [Route("/api/v1/[controller]/{id}/Movements")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(ViewGetMovementResponse))]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> GetMovement(int id, ViewGetMovementRequest request)
        {
            var user = _user.GetCurrent(HttpContext)!;
            if (! await _context.UserAccounts.AnyAsync(account => account.UserId == user.Id && account.AccountId == id))
            {
                return Forbid();
            }

            var initialBalance = request.From == null ? 0 : await _context.Transactions
                .Where(transaction => transaction.DateTime < request.From)
                .Where(transaction => transaction.SourceAccountId == id || transaction.DestinationAccountId == id)
                .Select(transaction => transaction.DestinationAccountId == id ? transaction.Total : -transaction.Total)
                .SumAsync();

            var query = _context.Transactions
                .Where(transaction => request.From == null || transaction.DateTime >= request.From)
                .Where(transaction => request.To == null || transaction.DateTime <= request.To)
                .Where(transaction => transaction.SourceAccountId == id || transaction.DestinationAccountId == id)
                .Select(transaction => new MovementItem
                {
                    AccountId = id,
                    Type = transaction.DestinationAccountId == id ? "revenue" : "expense",
                    Transaction = transaction
                });

            var result = await ApplyIntervalGrouping(request.From, request.Resolution, query).ToListAsync();

            var revenue = result.Where(item => item.Type == "revenue").ToDictionary(item => item.TimePoint, item => item.Total);
            var expenses = result.Where(item => item.Type == "expense").ToDictionary(item => item.TimePoint, item => item.Total);
            foreach (var key in revenue.Keys)
            {
                if (!expenses.ContainsKey(key)) expenses[key] = 0;
            }
            foreach (var key in expenses.Keys)
            {
                if (!revenue.ContainsKey(key)) revenue[key] = 0;
            }

            return Ok(new ViewGetMovementResponse
            {
                InitialBalance = initialBalance,
                Items = expenses.Join(revenue,
                        result => result.Key,
                        result => result.Key,
                        (a, b) => new ViewAccountMovementItem
                        {
                            DateTime = a.Key,
                            Expenses = a.Value,
                            Revenue = b.Value,
                        })
                    .OrderBy(item => item.DateTime).ToList()
            });
        }

        /// <summary>
        /// Returns revenue and expenses for all accounts added to net worth grouped in intervals
        /// </summary>
        /// <param name="request">An object representing the period and the interval to group by</param>
        /// <returns>The initial balance as well as a list of revenue and expenses for each interval</returns>
        [HttpPost()]
        [Route("/api/v1/[controller]/Movements")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(ViewGetMovementAllResponse))]
        public async Task<IActionResult> GetMovementAll(ViewGetMovementRequest request)
        {
            var user = _user.GetCurrent(HttpContext)!;
            List<ViewAccount> accounts = await _context.UserAccounts
                .Where(account => account.IncludeInNetWorth)
                .Where(account => account.UserId == user.Id)
                .SelectView()
                .ToListAsync();
            var netWorthAccountIds = accounts.Where(account => account.IncludeInNetWorth).Select(account => account.Id).ToList();

            var query = _context.Transactions
                .Where(transaction => request.From == null || transaction.DateTime >= request.From)
                .Where(transaction => request.To == null || transaction.DateTime <= request.To);

            // Calculate revenue and expenses for each account separately
            var revenueQuery = ApplyIntervalGrouping(request.From, request.Resolution,
                query.Where(transaction => netWorthAccountIds.Contains(transaction.DestinationAccountId ?? -1))
                .Select(transaction => new MovementItem
                {
                    AccountId = transaction.DestinationAccountId!.Value,
                    Type = "revenue",
                    Transaction = transaction
                }));

            // Calculate revenue and expenses for each account separately
            var expensesQuery = ApplyIntervalGrouping(request.From, request.Resolution,
                query.Where(transaction => netWorthAccountIds.Contains(transaction.SourceAccountId ?? -1))
                .Select(transaction => new MovementItem
                {
                    AccountId = transaction.SourceAccountId!.Value,
                    Type = "expense",
                    Transaction = transaction
                }));

            // Fetch both using a single query
            var revenue = (await revenueQuery.ToListAsync()).ToLookup(item => item.AccountId);
            var expenses = (await expensesQuery.ToListAsync()).ToLookup(item => item.AccountId);
            var output = new Dictionary<int, ViewGetMovementResponse>();

            foreach (var account in accounts)
            {
                var accountRevenue = revenue[account.Id].ToDictionary(item => item.TimePoint, item => item.Total);
                var accountExpenses = expenses[account.Id].ToDictionary(item => item.TimePoint, item => item.Total);
                foreach (var key in accountRevenue.Keys)
                {
                    if (!accountExpenses.ContainsKey(key)) accountExpenses[key] = 0;
                }
                foreach (var key in accountExpenses.Keys)
                {
                    if (!accountRevenue.ContainsKey(key)) accountRevenue[key] = 0;
                }

                var initialBalance = request.From == null ? 0 : await _context.Transactions
                    .Where(transaction => transaction.DateTime < request.From)
                    .Where(transaction => transaction.SourceAccountId == account.Id || transaction.DestinationAccountId == account.Id)
                    .Select(transaction => transaction.DestinationAccountId == account.Id ? transaction.Total : -transaction.Total)
                    .SumAsync();

                output[account.Id] = new ViewGetMovementResponse
                {
                    InitialBalance = initialBalance,
                    Items = accountExpenses.Join(accountRevenue,
                        result => result.Key,
                        result => result.Key,
                        (a, b) => new ViewAccountMovementItem
                        {
                            DateTime = a.Key,
                            Expenses = a.Value,
                            Revenue = b.Value,
                        })
                        .OrderBy(item => item.DateTime).ToList()
                };
            }

            return Ok(new ViewGetMovementAllResponse
            {
                Items = output,
                Accounts = accounts
            });
        }

        private IQueryable<AccountMovementGroup> ApplyIntervalGrouping(DateTime? from, AccountMovementResolution resolution, IQueryable<MovementItem> query)
        {
            switch (resolution)
            {
                case AccountMovementResolution.Daily:
                    return query.GroupBy(obj => new
                    {
                        account = obj.AccountId,
                        type = obj.Type,
                        timepoint = obj.Transaction.DateTime.Year.ToString() + "-" + obj.Transaction.DateTime.Month.ToString() + "-" + obj.Transaction.DateTime.Day.ToString()
                    }).Select(group => new AccountMovementGroup
                    {
                        Type = group.Key.type,
                        AccountId = group.Key.account,
                        TimePoint = DateTime.ParseExact(group.Key.timepoint, "yyyy-M-d", CultureInfo.InvariantCulture),
                        Total = group.Select(obj => obj.Transaction.Total).Sum(),
                    });
                case AccountMovementResolution.Weekly:
                    var offset = from ?? new DateTime(1900, 01, 01);
                    return query.Select(obj => new
                    {
                        obj.Transaction,
                        obj.Type,
                        obj.AccountId,
                        week = Math.Floor(EF.Functions.DateDiffDay(offset, obj.Transaction.DateTime) / 7.0)
                    }).GroupBy(obj => new
                    {
                        account = obj.AccountId,
                        type = obj.Type,
                        timepoint = obj.week,
                    }).Select(group => new AccountMovementGroup
                    {
                        Type = group.Key.type,
                        AccountId = group.Key.account,
                        TimePoint = offset.AddDays(group.Key.timepoint * 7),
                        Total = group.Select(obj => obj.Transaction.Total).Sum(),
                    });
                case AccountMovementResolution.Monthly:
                    return query.GroupBy(obj => new
                    {
                        account = obj.AccountId,
                        type = obj.Type,
                        timepoint = obj.Transaction.DateTime.Year.ToString() + "-" + obj.Transaction.DateTime.Month.ToString()
                    }).Select(group => new AccountMovementGroup
                    {
                        Type = group.Key.type,
                        AccountId = group.Key.account,
                        TimePoint = DateTime.ParseExact(group.Key.timepoint + "-01", "yyyy-M-dd", CultureInfo.InvariantCulture),
                        Total = group.Select(obj => obj.Transaction.Total).Sum(),
                    });
                case AccountMovementResolution.Yearly:
                    return query.GroupBy(obj => new
                    {
                        account = obj.AccountId,
                        type = obj.Type,
                        timepoint = obj.Transaction.DateTime.Year.ToString()
                    }).Select(group => new AccountMovementGroup
                    {
                        Type = group.Key.type,
                        AccountId = group.Key.account,
                        TimePoint = DateTime.ParseExact(group.Key.timepoint + "-01-01", "yyyy-MM-dd", CultureInfo.InvariantCulture),
                        Total = group.Select(obj => obj.Transaction.Total).Sum(),
                    });

                default:
                    throw new Exception($"Unknown resolution {resolution}");
            }
        }

        [HttpPost()]
        [Route("/api/v1/[controller]/{id}/[action]")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(List<ViewCategorySummary>))]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> CategorySummary(int id, SearchGroup? query)
        {
            var user = _user.GetCurrent(HttpContext)!;
            if (! await _context.UserAccounts.AnyAsync(u => u.UserId == user.Id && u.AccountId == id))
            {
                return NotFound();
            }

            return Ok(await _context.TransactionLines
                .Where(line => line.Transaction.SourceAccountId == id || line.Transaction.DestinationAccountId == id)
                .ApplySearch(query)
                .GroupBy(line => line.Category)
                .Select(group => new ViewCategorySummary
                {
                    Category = group.Key,
                    Revenue = group
                        .Where(line => (line.Transaction.DestinationAccountId == id && line.Amount > 0) || (line.Transaction.SourceAccountId == id && line.Amount < 0))
                        .Select(line => line.Amount)
                        .Sum(),
                    Expenses = group
                        .Where(line => (line.Transaction.DestinationAccountId == id && line.Amount < 0) || (line.Transaction.SourceAccountId == id && line.Amount > 0))
                        .Select(line => line.Amount)
                        .Sum()
                })
                .ToListAsync());
        }

        #endregion
    }
}
