using assetgrid_backend.Data;
using assetgrid_backend.Helpers;
using assetgrid_backend.Models;
using assetgrid_backend.ViewModels;
using assetgrid_backend.Services;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Globalization;

namespace assetgrid_backend.Controllers
{
    [ApiController]
    [Authorize]
    [Route("/api/v1/[controller]")]
    public class AccountController : Controller
    {
        private readonly AssetgridDbContext _context;
        private readonly IUserService _user;
        private readonly IOptions<ApiBehaviorOptions> _apiBehaviorOptions;

        public AccountController(AssetgridDbContext context, IUserService userService, IOptions<ApiBehaviorOptions> apiBehaviorOptions)
        {
            _context = context;
            _user = userService;
            _apiBehaviorOptions = apiBehaviorOptions;
        }

        /// <summary>
        /// Creates a new account
        /// </summary>
        /// <param name="model">The account to be created</param>
        /// <returns>The newly created account</returns>
        [HttpPost()]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(ViewAccount))]
        public IActionResult Create(ViewCreateAccount model)
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
                        AccountNumber = model.AccountNumber,
                    };
                    _context.Accounts.Add(result);
                    _context.SaveChanges();

                    var userAccount = new UserAccount
                    {
                        AccountId = result.Id,
                        Favorite = model.Favorite,
                        IncludeInNetWorth = model.IncludeInNetWorth,
                        Permissions = UserAccountPermissions.All,
                        UserId = user.Id,
                    };
                    _context.UserAccounts.Add(userAccount);
                    _context.SaveChanges();

                    transaction.Commit();

                    return Ok(new ViewAccount(
                        id: result.Id,
                        accountNumber: result.AccountNumber,
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
        public IActionResult Get(int id)
        {
            var user = _user.GetCurrent(HttpContext)!;
            var result = _context.UserAccounts
                .Where(account => account.UserId == user.Id && account.AccountId == id)
                .SelectView()
                .SingleOrDefault();

            if (result == null) return NotFound();

            var balance = _context.Transactions
                .Where(transaction => transaction.SourceAccountId == id || transaction.DestinationAccountId == id)
                .Select(transaction => transaction.DestinationAccountId == id ? transaction.Total : -transaction.Total)
                .Sum();

            result.Balance = balance;

            return Ok(result);
        }

        [HttpPut()]
        [Route("/api/v1/[controller]/{id}")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(ViewAccount))]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public IActionResult Update(int id, ViewAccount model)
        {
            var user = _user.GetCurrent(HttpContext)!;
            var result = _context.UserAccounts
                .Include(account => account.Account)
                .SingleOrDefault(account => account.UserId == user.Id && account.AccountId == id);

            if (result == null)
            {
                return NotFound();
            }
            if (result.Permissions != UserAccountPermissions.All)
            {
                return Forbid();
            }

            result.Account.AccountNumber = model.AccountNumber;
            result.Account.Description = model.Description;
            result.Account.Name = model.Name;
            result.Favorite = model.Favorite;
            result.IncludeInNetWorth = model.IncludeInNetWorth;

            _context.SaveChanges();

            return Ok(new ViewAccount(
                id: result.Id,
                name: result.Account.Name,
                description: result.Account.Description,
                accountNumber: result.Account.AccountNumber,
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
        public IActionResult Delete(int id)
        {
            var user = _user.GetCurrent(HttpContext)!;
            using (var transaction = _context.Database.BeginTransaction())
            {
                var dbObject = _context.UserAccounts
                    .Include(account => account.Account)
                    .Where(account => account.AccountId == id && account.UserId == user.Id)
                    .SingleOrDefault();

                if (dbObject == null)
                {
                    return NotFound();
                }
                if (dbObject.Permissions != UserAccountPermissions.All)
                {
                    return Forbid();
                }

                if (_context.Database.ProviderName == "Microsoft.EntityFrameworkCore.InMemory")
                {
                    // InMemory database does not support raw SQL
                    _context.Transactions.Where(transaction => transaction.SourceAccountId == id).ToList().ForEach(transaction => transaction.SourceAccountId = null);
                    _context.Transactions.Where(transaction => transaction.DestinationAccountId == id).ToList().ForEach(transaction => transaction.DestinationAccountId = null);
                    _context.Transactions.RemoveRange(
                        _context.Transactions.Where(transaction => transaction.DestinationAccountId == null && transaction.SourceAccountId == null));
                    _context.Accounts.RemoveRange(
                        _context.Accounts.Where(account => account.Id == id));
                }
                else
                {
                    // Remove all references to this account on transactions
                    _context.Database.ExecuteSqlInterpolated($"UPDATE Transactions SET SourceAccountId = null WHERE SourceAccountId = {id}");
                    _context.Database.ExecuteSqlInterpolated($"UPDATE Transactions SET DestinationAccountId = null WHERE DestinationAccountId = {id}");
                    // Delete transactions that do not have any accounts
                    _context.Database.ExecuteSqlInterpolated($"DELETE FROM Transactions WHERE SourceAccountId IS NULL AND DestinationAccountId IS NULL");
                    // Delete UserAccounts referencing this account
                    _context.Database.ExecuteSqlInterpolated($"DELETE FROM UserAccounts WHERE AccountId = {id}");
                    _context.Accounts.Remove(dbObject.Account);
                }
                _context.SaveChanges();

                transaction.Commit();

                return Ok();
            }
        }

        [HttpPost()]
        [Route("/api/v1/[controller]/[action]")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(ViewSearchResponse<ViewAccount>))]
        public IActionResult Search(ViewSearch query)
        {
            var user = _user.GetCurrent(HttpContext)!;
            var result = _context.UserAccounts
                .Where(account => account.UserId == user.Id)
                .ApplySearch(query, true)
                .Skip(query.From)
                .Take(query.To - query.From)
                .SelectView()
                .ToList();

            return Ok(new ViewSearchResponse<ViewAccount>
            {
                Data = result,
                TotalItems = _context.UserAccounts
                    .Where(account => account.UserId == user.Id)
                    .ApplySearch(query, false).Count()
            });
        }

        [HttpPost()]
        [Route("/api/v1/[controller]/{id}/[action]")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(ViewTransactionList))]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public IActionResult Transactions(int id, ViewTransactionListRequest request)
        {
            var user = _user.GetCurrent(HttpContext)!;
            if (!_context.UserAccounts.Any(account => account.UserId == user.Id && account.AccountId == id))
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

            var result = query
                .Skip(request.From)
                .Take(request.To - request.From)
                .SelectView(user.Id)
                .ToList();
            var firstTransaction = result
                .OrderBy(transaction => transaction.DateTime)
                .ThenBy(transaction => transaction.Id).FirstOrDefault();
            var total = firstTransaction == null ? 0 : query
                .Where(transaction => transaction.DateTime < firstTransaction.DateTime || (transaction.DateTime == firstTransaction.DateTime && transaction.Id < firstTransaction.Id))
                .Select(transaction => transaction.Total * (transaction.DestinationAccountId == id ? 1 : -1))
                .Sum();

            return Ok(new ViewTransactionList
            {
                Data = result,
                TotalItems = query.Count(),
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
        public IActionResult CountTransactions(int id, ViewSearchGroup? requestQuery)
        {
            var user = _user.GetCurrent(HttpContext)!;
            if (!_context.UserAccounts.Any(account => account.UserId == user.Id && account.AccountId == id))
            {
                return NotFound();
            }

            var query = _context.Transactions
                .Where(transaction => transaction.SourceAccountId == id || transaction.DestinationAccountId == id);

            if (requestQuery != null)
            {
                query = query.ApplySearch(requestQuery);
            }

            return Ok(query.Count());
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
        public IActionResult GetMovement(int id, ViewGetMovementRequest request)
        {
            var user = _user.GetCurrent(HttpContext)!;
            if (!_context.UserAccounts.Any(account => account.UserId == user.Id && account.AccountId == id))
            {
                return Forbid();
            }

            var initialBalance = request.From == null ? 0 : _context.Transactions
                .Where(transaction => transaction.DateTime < request.From)
                .Where(transaction => transaction.SourceAccountId == id || transaction.DestinationAccountId == id)
                .Select(transaction => transaction.DestinationAccountId == id ? transaction.Total : -transaction.Total)
                .Sum();

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

            var result = ApplyIntervalGrouping(request.From, request.Resolution, query).ToList();

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
        public IActionResult GetMovementAll(ViewGetMovementRequest request)
        {
            var user = _user.GetCurrent(HttpContext)!;
            List<ViewAccount> accounts = _context.UserAccounts
                .Where(account => account.IncludeInNetWorth)
                .Where(account => account.UserId == user.Id)
                .SelectView()
                .ToList();
            var netWorthAccountIds = accounts.Where(account => account.IncludeInNetWorth).Select(account => account.Id).ToList();

            var query = _context.Transactions
                .Where(transaction => request.From == null || transaction.DateTime >= request.From)
                .Where(transaction => request.To == null || transaction.DateTime <= request.To);

            // Calculate revenue and expenses for each account separately
            var revenueQuery = ApplyIntervalGrouping(request.From, request.Resolution,
                query.Where(transaction => netWorthAccountIds.Contains(transaction.DestinationAccountId ?? -1) && !netWorthAccountIds.Contains(transaction.SourceAccountId ?? -1))
                .Select(transaction => new MovementItem
                {
                    AccountId = transaction.DestinationAccountId!.Value,
                    Type = "revenue",
                    Transaction = transaction
                }));

            // Calculate revenue and expenses for each account separately
            var expensesQuery = ApplyIntervalGrouping(request.From, request.Resolution,
                query.Where(transaction => netWorthAccountIds.Contains(transaction.SourceAccountId ?? -1) && !netWorthAccountIds.Contains(transaction.DestinationAccountId ?? -1))
                .Select(transaction => new MovementItem
                {
                    AccountId = transaction.SourceAccountId!.Value,
                    Type = "expense",
                    Transaction = transaction
                }));

            // Fetch both using a single query
            var revenue = revenueQuery.ToLookup(item => item.AccountId);
            var expenses = expensesQuery.ToLookup(item => item.AccountId);
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

                var initialBalance = request.From == null ? 0 : _context.Transactions
                    .Where(transaction => transaction.DateTime < request.From)
                    .Where(transaction => transaction.SourceAccountId == account.Id || transaction.DestinationAccountId == account.Id)
                    .Select(transaction => transaction.DestinationAccountId == account.Id ? transaction.Total : -transaction.Total)
                    .Sum();

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
        public IActionResult CategorySummary(int id, ViewSearchGroup? query)
        {
            var user = _user.GetCurrent(HttpContext)!;
            if (!_context.UserAccounts.Any(u => u.UserId == user.Id && u.AccountId == id))
            {
                return NotFound();
            }

            return Ok(_context.Transactions
                .Where(transaction => transaction.SourceAccountId == id || transaction.DestinationAccountId == id)
                .ApplySearch(query)
                .GroupBy(transaction => transaction.Category)
                .Select(group => new ViewCategorySummary
                {
                    Category = group.Key,
                    Revenue = group.Where(t => t.DestinationAccountId == id).Select(t => t.Total).Sum(),
                    Expenses = group.Where(t => t.SourceAccountId == id).Select(t => t.Total).Sum()
                })
                .ToList());
        }

        #endregion
    }
}
