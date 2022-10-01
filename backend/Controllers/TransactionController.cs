using assetgrid_backend.Data;
using assetgrid_backend.Helpers;
using assetgrid_backend.Models;
using assetgrid_backend.ViewModels;
using assetgrid_backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Security.Principal;

namespace assetgrid_backend.Controllers
{
    [ApiController]
    [Authorize]
    [Route("/api/v1/[controller]")]
    public class TransactionController : ControllerBase
    {
        private readonly AssetgridDbContext _context;
        private readonly IUserService _user;
        private readonly IOptions<ApiBehaviorOptions> _apiBehaviorOptions;

        public TransactionController(AssetgridDbContext context, IUserService userService, IOptions<ApiBehaviorOptions> apiBehaviorOptions)
        {
            _context = context;
            _user = userService;
            _apiBehaviorOptions = apiBehaviorOptions;
        }

        [HttpGet()]
        [Route("/api/v1/[controller]/{id}")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(ViewTransaction))]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public IActionResult Get(int id)
        {
            var user = _user.GetCurrent(HttpContext)!;
            var result = _context.Transactions
                .Where(transaction => _context.UserAccounts.Any(account => account.UserId == user.Id &&
                    (account.AccountId == transaction.SourceAccountId || account.AccountId == transaction.DestinationAccountId)))
                .SelectView(user.Id)
                .SingleOrDefault(transaction => transaction.Id == id);

            if (result == null) return NotFound();

            return Ok(result);
        }

        [HttpPost()]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(ViewTransaction))]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public IActionResult Create(ViewCreateTransaction model)
        {
            var user = _user.GetCurrent(HttpContext)!;
            if (string.IsNullOrWhiteSpace(model.Identifier))
            {
                model.Identifier = null;
            }

            if (ModelState.IsValid)
            {
                if (model.Identifier != null)
                {
                    var otherTransactionsWithSameIdentifier = _context.Transactions
                        .Where(t => t.Identifier == model.Identifier.Trim())
                        .Any(t => t.SourceAccount!.Users!.Any(u => u.UserId == user.Id) || t.DestinationAccount!.Users!.Any(u => u.UserId == user.Id));
                    if (otherTransactionsWithSameIdentifier)
                    {
                        ModelState.AddModelError(nameof(model.Identifier), "Another transaction with this identifier exists");
                        return _apiBehaviorOptions.Value?.InvalidModelStateResponseFactory(ControllerContext) ?? BadRequest();
                    }
                }

                using (var transaction = _context.Database.BeginTransaction())
                {
                    // Make sure that the user has permission to create transactions on both accounts referenced by this transaction
                    UserAccountPermissions[] writePermissions = new[] { UserAccountPermissions.All, UserAccountPermissions.ModifyTransactions };
                    var userAccountSource = model.SourceId == null ? null : _context.UserAccounts
                        .Where(account => account.UserId == user.Id && account.AccountId == model.SourceId)
                        .SingleOrDefault();
                    var userAccountDestination = model.DestinationId == null ? null : _context.UserAccounts
                        .Where(account => account.UserId == user.Id && account.AccountId == model.DestinationId)
                        .SingleOrDefault();
                    if ((model.SourceId != null && (userAccountSource == null || ! writePermissions.Contains(userAccountSource.Permissions))) ||
                        (model.DestinationId != null && (userAccountDestination == null || ! writePermissions.Contains(userAccountDestination.Permissions))))
                    {
                        return Forbid();
                    }


                    var result = new Transaction
                    {
                        DateTime = model.DateTime,
                        SourceAccountId = model.SourceId,
                        Description = model.Description,
                        DestinationAccountId = model.DestinationId,
                        Identifier = model.Identifier?.Trim(),
                        Total = model.Total ?? model.Lines.Select(line => line.Amount).Sum(),
                        Category = string.IsNullOrWhiteSpace(model.Category) ? "" : model.Category,
                        TransactionLines = model.Lines.Select((line, i) => new TransactionLine
                        {
                            Amount = line.Amount,
                            Description = line.Description,
                            Order = i + 1,
                        }).ToList(),
                    };

                    // Always store transactions in a format where the total is positive
                    if (result.Total < 0)
                    {
                        result.Total = -result.Total;

                        // Swap accounts
                        var sourceId = result.SourceAccountId;
                        result.SourceAccountId = result.DestinationAccountId;
                        result.DestinationAccountId = sourceId;

                        // Also swap UserAccounts
                        var temp = userAccountDestination;
                        userAccountDestination = userAccountSource;
                        userAccountSource = temp;

                        result.TransactionLines.ForEach(line => line.Amount = -line.Amount);
                    }

                    _context.Transactions.Add(result);
                    transaction.Commit();
                    _context.SaveChanges();
                    return Ok(new ViewTransaction {
                        Id = result.Id,
                        Identifier = result.Identifier,
                        DateTime = result.DateTime,
                        Description = result.Description,
                        Category = result.Category,
                        Total = result.Total,
                        Source = result.SourceAccount != null
                            ? userAccountSource == null ? ViewAccount.GetNoReadAccess(result.SourceAccount.Id) : new ViewAccount(
                                id: result.SourceAccount.Id,
                                name: result.SourceAccount.Name,
                                description: result.SourceAccount.Description,
                                accountNumber: result.SourceAccount.AccountNumber,
                                favorite: userAccountSource!.Favorite,
                                includeInNetWorth: userAccountSource!.IncludeInNetWorth,
                                permissions: ViewAccount.PermissionsFromDbPermissions(userAccountSource!.Permissions),
                                balance: 0
                            ) : null,
                        Destination = result.DestinationAccount != null
                             ? userAccountDestination == null ? ViewAccount.GetNoReadAccess(result.DestinationAccount.Id) : new ViewAccount(
                                id: result.DestinationAccount.Id,
                                name: result.DestinationAccount.Name,
                                description: result.DestinationAccount.Description,
                                accountNumber: result.DestinationAccount.AccountNumber,
                                favorite: userAccountDestination!.Favorite,
                                includeInNetWorth: userAccountDestination!.IncludeInNetWorth,
                                permissions: ViewAccount.PermissionsFromDbPermissions(userAccountDestination!.Permissions),
                                balance: 0
                            ) : null,
                        Lines = result.TransactionLines
                            .OrderBy(line => line.Order)
                            .Select(line => new ViewTransactionLine(amount: line.Amount, description: line.Description))
                            .ToList(),
                    });
                }
            }
            return _apiBehaviorOptions.Value?.InvalidModelStateResponseFactory(ControllerContext) ?? BadRequest();
        }

        #region Update transactions

        [HttpPut()]
        [Route("/api/v1/[controller]/{id}")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(ViewTransaction))]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public IActionResult Update(int id, ViewUpdateTransaction model)
        {
            var user = _user.GetCurrent(HttpContext)!;
            if (ModelState.IsValid)
            {
                using (var transaction = _context.Database.BeginTransaction())
                {
                    var dbObject = _context.Transactions
                        .Include(t => t.SourceAccount!.Users!.Where(u => u.UserId == user.Id))
                        .Include(t => t.DestinationAccount!.Users!.Where(u => u.UserId == user.Id))
                        .Include(t => t.TransactionLines)
                        .Single(t => t.Id == id);

                    if (dbObject.SourceAccount?.Users?.SingleOrDefault(x => x.UserId == user.Id) == null && dbObject.DestinationAccount?.Users?.SingleOrDefault(x => x.UserId == user.Id) == null)
                    {
                        // The user has read permissions to neither source nor destination
                        return NotFound();
                    }

                    var writePermissions = new[] { UserAccountPermissions.All, UserAccountPermissions.ModifyTransactions };
                    if (dbObject.SourceAccount?.Users?.SingleOrDefault(x => x.UserId == user.Id && writePermissions.Contains(x.Permissions)) == null &&
                        dbObject.DestinationAccount?.Users?.SingleOrDefault(x => x.UserId == user.Id && writePermissions.Contains(x.Permissions)) == null)
                    {
                        // User does not have write permission to this transaction, but they can read it
                        return Forbid();
                    }

                    var result = UpdateTransaction(dbObject, user, model);
                    transaction.Commit();
                    return result;
                }
            }
            return _apiBehaviorOptions.Value?.InvalidModelStateResponseFactory(ControllerContext) ?? BadRequest();
        }

        [HttpPost()]
        [Route("/api/v1/[controller]/[Action]")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public IActionResult UpdateMultiple(ViewUpdateMultipleTransactions request)
        {
            var user = _user.GetCurrent(HttpContext)!;
            if (ModelState.IsValid)
            {
                using (var transaction = _context.Database.BeginTransaction())
                {
                    // Get a list of all accounts the user can write to
                    var writeAccountIds = _context.UserAccounts
                        .Where(account => account.UserId == user.Id && new[] { UserAccountPermissions.All, UserAccountPermissions.ModifyTransactions }.Contains(account.Permissions))
                        .Select(account => account.AccountId)
                        .ToList();

                    var query = _context.Transactions
                        .Include(t => t.SourceAccount!.Users!.Where(u => u.UserId == user.Id))
                        .Include(t => t.DestinationAccount!.Users!.Where(u => u.UserId == user.Id))
                        .Include(t => t.TransactionLines)
                        .Where(t => writeAccountIds.Contains(t.SourceAccountId ?? -1) || writeAccountIds.Contains(t.DestinationAccountId ?? -1))
                        .ApplySearch(request.query);

                    var transactions = query.ToList();
                    foreach (var dbObject in transactions)
                    {
                        // We ignore any errors returned
                        UpdateTransaction(dbObject, user, request.model);
                    }
                    transaction.Commit();
                }
                return Ok();
            }
            return _apiBehaviorOptions.Value?.InvalidModelStateResponseFactory(ControllerContext) ?? BadRequest();
        }

        private IActionResult UpdateTransaction(Transaction dbObject, User user, ViewUpdateTransaction model)
        {
            // Update accounts
            var writePermissions = new[] { UserAccountPermissions.ModifyTransactions, UserAccountPermissions.All };
            if (model.SourceId != null && dbObject.SourceAccountId != model.SourceId)
            {
                if (model.SourceId == -1)
                {
                    dbObject.SourceAccountId = null;
                    dbObject.SourceAccount = null;
                }
                else
                {
                    var newSourceUserAccount = _context.UserAccounts
                    .Include(x => x.Account)
                    .SingleOrDefault(x => x.UserId == user.Id && x.AccountId == model.SourceId && writePermissions.Contains(x.Permissions));
                    if (newSourceUserAccount == null)
                    {
                        return Forbid();
                    }
                    dbObject.SourceAccountId = newSourceUserAccount.Id;
                    dbObject.SourceAccount = newSourceUserAccount.Account;
                }
            }
            if (model.DestinationId != null && dbObject.DestinationAccountId != model.DestinationId)
            {
                if (model.DestinationId == -1)
                {
                    dbObject.DestinationAccountId = null;
                    dbObject.DestinationAccount = null;
                }
                else
                {
                    var newDestinationUserAccount = _context.UserAccounts
                        .Include(x => x.Account)
                        .SingleOrDefault(x => x.UserId == user.Id && x.AccountId == model.DestinationId && writePermissions.Contains(x.Permissions));
                    if (newDestinationUserAccount == null)
                    {
                        return Forbid();
                    }
                    dbObject.DestinationAccountId = newDestinationUserAccount.Id;
                    dbObject.DestinationAccount = newDestinationUserAccount.Account;
                }
            }

            // Update remaining properties
            if (model.DateTime != null)
            {
                dbObject.DateTime = model.DateTime.Value;
            }
            if (model.Description != null)
            {
                dbObject.Description = model.Description;
            }
            if (model.HasUniqueIdentifier)
            {
                if (string.IsNullOrWhiteSpace(model.Identifier)) model.Identifier = null;
                dbObject.Identifier = model.Identifier?.Trim();
            }
            if (model.Category != null)
            {
                dbObject.Category = model.Category;
            }
            if (model.Total != null && dbObject.TransactionLines.Count == 0)
            {
                dbObject.Total = model.Total.Value;
                if (dbObject.Total < 0)
                {
                    // All transactions must have positive totals
                    dbObject.Total = -dbObject.Total;
                    var source = dbObject.SourceAccountId;
                    dbObject.SourceAccountId = dbObject.DestinationAccountId;
                    dbObject.DestinationAccountId = source;
                }
            }
            if (model.Lines != null)
            {
                if (model.Total != null)
                {
                    dbObject.Total = model.Total.Value;
                }

                _context.RemoveRange(dbObject.TransactionLines);
                dbObject.TransactionLines = model.Lines.Select((line, index) =>
                    new TransactionLine
                    {
                        Amount = line.Amount,
                        Description = line.Description,
                        Order = index,
                        Transaction = dbObject,
                        TransactionId = dbObject.Id,
                    })
                    .ToList();

                if (dbObject.Total < 0)
                {
                    // All transactions must have positive totals
                    dbObject.Total = -dbObject.Total;
                    var source = dbObject.SourceAccountId;
                    dbObject.SourceAccountId = dbObject.DestinationAccountId;
                    dbObject.DestinationAccountId = source;
                    dbObject.TransactionLines.ForEach(line => line.Amount = -line.Amount);
                }
            }

            if (dbObject.SourceAccountId == null && dbObject.DestinationAccountId == null)
            {
                ModelState.AddModelError(nameof(dbObject.SourceAccountId), "Either source or destination id must be set.");
                ModelState.AddModelError(nameof(dbObject.DestinationAccountId), "Either source or destination id must be set.");
                return _apiBehaviorOptions.Value.InvalidModelStateResponseFactory(ControllerContext);
            }
            if (dbObject.SourceAccountId == dbObject.DestinationAccountId)
            {
                ModelState.AddModelError(nameof(dbObject.SourceAccountId), "Source and destination must be different.");
                ModelState.AddModelError(nameof(dbObject.DestinationAccountId), "Source and destination must be different.");
                return _apiBehaviorOptions.Value.InvalidModelStateResponseFactory(ControllerContext);
            }

            _context.SaveChanges();

            var sourceUserAccount = dbObject.SourceAccount?.Users?.SingleOrDefault(x => x.UserId == user.Id);
            var destinationUserAccount = dbObject.DestinationAccount?.Users?.SingleOrDefault(x => x.UserId == user.Id);

            return Ok(new ViewTransaction
            {
                Id = dbObject.Id,
                Identifier = dbObject.Identifier,
                DateTime = dbObject.DateTime,
                Description = dbObject.Description,
                Category = dbObject.Category,
                Total = dbObject.Total,
                Source = dbObject.SourceAccount != null
                    ? sourceUserAccount == null ? ViewAccount.GetNoReadAccess(dbObject.SourceAccount.Id) : new ViewAccount(
                        id: dbObject.SourceAccount.Id,
                        name: dbObject.SourceAccount.Name,
                        description: dbObject.SourceAccount.Description,
                        accountNumber: dbObject.SourceAccount.AccountNumber,
                        favorite: sourceUserAccount.Favorite,
                        includeInNetWorth: sourceUserAccount.IncludeInNetWorth,
                        permissions: ViewAccount.PermissionsFromDbPermissions(sourceUserAccount.Permissions),
                        balance: 0
                    ) : null,
                Destination = dbObject.DestinationAccount != null
                    ? destinationUserAccount == null ? ViewAccount.GetNoReadAccess(dbObject.DestinationAccount.Id) : new ViewAccount(
                        id: dbObject.DestinationAccount.Id,
                        name: dbObject.DestinationAccount.Name,
                        description: dbObject.DestinationAccount.Description,
                        accountNumber: dbObject.DestinationAccount.AccountNumber,
                        favorite: destinationUserAccount.Favorite,
                        includeInNetWorth: destinationUserAccount.IncludeInNetWorth,
                        permissions: ViewAccount.PermissionsFromDbPermissions(destinationUserAccount.Permissions),
                        balance: 0
                    ) : null,
                Lines = dbObject.TransactionLines
                    .OrderBy(line => line.Order)
                    .Select(line => new ViewTransactionLine(amount: line.Amount, description: line.Description))
                    .ToList(),
            });
        }

        #endregion

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
                var dbObject = _context.Transactions
                    .Single(t => t.Id == id);

                // Make sure that the user has write permissions to an account this transaction references
                var permissions = _context.UserAccounts
                    .Where(x => x.UserId == user.Id && (x.AccountId == dbObject.DestinationAccountId || x.AccountId == dbObject.SourceAccountId))
                    .Select(x => x.Permissions)
                    .ToList();
                if (permissions.Count == 0)
                {
                    // User cannot see this transaction
                    return NotFound();
                }
                if (!permissions.Any(permissions => new[] { UserAccountPermissions.All, UserAccountPermissions.ModifyTransactions }.Contains(permissions)))
                {
                    // User can see transaction but cannot modify it
                    return Forbid();
                }

                _context.Transactions.Remove(dbObject);
                _context.SaveChanges();
                transaction.Commit();

                return Ok();
            }
        }

        [HttpDelete()]
        [Route("/api/v1/[controller]/[Action]")]
        public IActionResult DeleteMultiple(ViewSearchGroup query)
        {
            var user = _user.GetCurrent(HttpContext)!;
            if (ModelState.IsValid)
            {
                using (var transaction = _context.Database.BeginTransaction())
                {
                    // Get a list of all accounts the user can write to
                    var writeAccountIds = _context.UserAccounts
                        .Where(account => account.UserId == user.Id && new[] { UserAccountPermissions.All, UserAccountPermissions.ModifyTransactions }.Contains(account.Permissions))
                        .Select(account => account.AccountId)
                        .ToList();

                    var transactions = _context.Transactions
                        .Include(t => t.TransactionLines)
                        .Where(t => writeAccountIds.Contains(t.SourceAccountId ?? -1) || writeAccountIds.Contains(t.DestinationAccountId ?? -1))
                        .ApplySearch(query)
                        .ToList();

                    _context.RemoveRange(transactions.SelectMany(transaction => transaction.TransactionLines));
                    _context.RemoveRange(transactions);
                    _context.SaveChanges();
                    transaction.Commit();
                }
                return Ok();
            }
            return _apiBehaviorOptions.Value?.InvalidModelStateResponseFactory(ControllerContext) ?? BadRequest();
        }

        [HttpPost()]
        [Route("/api/v1/[controller]/[action]")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(ViewSearchResponse<ViewTransaction>))]
        public IActionResult Search(ViewSearch query)
        {
            var user = _user.GetCurrent(HttpContext)!;
            if (ModelState.IsValid)
            {
                var result = _context.Transactions
                .Where(transaction => _context.UserAccounts.Any(account => account.UserId == user.Id &&
                    (account.AccountId == transaction.SourceAccountId || account.AccountId == transaction.DestinationAccountId)))
                .ApplySearch(query, true)
                .Skip(query.From)
                .Take(query.To - query.From)
                .SelectView(user.Id)
                .ToList();

                return Ok(new ViewSearchResponse<ViewTransaction>
                {
                    Data = result,
                    TotalItems = _context.Transactions.ApplySearch(query, false).Count(),
                });
            }
            return _apiBehaviorOptions.Value?.InvalidModelStateResponseFactory(ControllerContext) ?? BadRequest();
        }

        [HttpPost()]
        [Route("/api/v1/[controller]/[action]")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(List<string>))]
        public IActionResult FindDuplicates(List<string> identifiers)
        {
            var user = _user.GetCurrent(HttpContext)!;
            return Ok(_context.Transactions
                .Where(transaction => transaction.SourceAccount!.Users!.Any(u => u.UserId == user.Id) || transaction.DestinationAccount!.Users!.Any(u => u.UserId == user.Id))
                .Where(transaction => transaction.Identifier != null && identifiers.Contains(transaction.Identifier))
                .Select(transaction => transaction.Identifier!)
                .ToList());
        }

        [HttpPost()]
        [Route("/api/v1/[controller]/[action]")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(ViewTransactionCreateManyResponse))]
        public IActionResult CreateMany(List<ViewCreateTransaction> transactions)
        {
            var user = _user.GetCurrent(HttpContext)!;

            if (ModelState.IsValid)
            {

                var failed = new List<ViewCreateTransaction>();
                var duplicate = new List<ViewCreateTransaction>();
                var success = new List<ViewCreateTransaction>();

                var writeAccountIds = _context.UserAccounts
                    .Where(account => account.UserId == user.Id && new[] { UserAccountPermissions.All, UserAccountPermissions.ModifyTransactions }.Contains(account.Permissions))
                    .Select(account => account.AccountId)
                    .ToList();

                var identifiers = transactions
                    .Select(t => string.IsNullOrWhiteSpace(t.Identifier) ? null : t.Identifier.Trim())
                    .Where(x => x != null)
                    .ToArray();
                var duplicateIdentifiers = _context.Transactions
                    .Where(x => writeAccountIds.Contains(x.SourceAccountId ?? -1) || writeAccountIds.Contains(x.DestinationAccountId ?? -1))
                    .Where(x => identifiers.Contains(x.Identifier))
                    .Select(x => x.Identifier)
                    .ToHashSet();

                foreach (var transaction in transactions)
                {
                    if (string.IsNullOrWhiteSpace(transaction.Identifier)) transaction.Identifier = null;
                    transaction.Identifier = transaction.Identifier?.Trim();

                    if (duplicateIdentifiers.Contains(transaction.Identifier))
                    {
                        duplicate.Add(transaction);
                    }
                    else
                    {
                        try
                        {
                            if ((transaction.SourceId.HasValue && ! writeAccountIds.Contains(transaction.SourceId.Value)) ||
                                (transaction.DestinationId.HasValue && !writeAccountIds.Contains(transaction.DestinationId.Value)))
                            {
                                throw new Exception("Cannot write to this account");
                            }

                            if (transaction.Identifier != null) duplicateIdentifiers.Add(transaction.Identifier);

                            var result = new Models.Transaction
                            {
                                DateTime = transaction.DateTime,
                                SourceAccountId = transaction.SourceId,
                                Description = transaction.Description,
                                DestinationAccountId = transaction.DestinationId,
                                Identifier = transaction.Identifier?.Trim(),
                                Total = transaction.Total ?? transaction.Lines.Select(line => line.Amount).Sum(),
                                Category = transaction.Category,
                                TransactionLines = transaction.Lines.Select((line, i) => new Models.TransactionLine
                                {
                                    Amount = line.Amount,
                                    Description = line.Description,
                                    Order = i + 1,
                                }).ToList(),
                            };

                            // Always store transactions in a format where the total is positive
                            if (result.Total < 0)
                            {
                                result.Total = -result.Total;
                                var sourceId = result.SourceAccountId;
                                result.SourceAccountId = result.DestinationAccountId;
                                result.DestinationAccountId = sourceId;
                                result.TransactionLines.ForEach(line => line.Amount = -line.Amount);
                            }

                            _context.Transactions.Add(result);
                            _context.SaveChanges();
                            success.Add(transaction);
                        }
                        catch (Exception)
                        {
                            failed.Add(transaction);
                        }
                    }
                }

                return Ok(new ViewTransactionCreateManyResponse
                {
                    Succeeded = success,
                    Duplicate = duplicate,
                    Failed = failed,
                });
            }

            return _apiBehaviorOptions.Value?.InvalidModelStateResponseFactory(ControllerContext) ?? BadRequest();
        }
    }
}