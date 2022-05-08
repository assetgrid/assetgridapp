using homebudget_server.Data;
using homebudget_server.Models.ViewModels;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace homebudget_server.Controllers
{
    [ApiController]
    [EnableCors("AllowAll")]
    [Route("[controller]")]
    public class TransactionController : ControllerBase
    {
        private readonly ILogger<TransactionController> _logger;
        private readonly HomebudgetContext _context;

        public TransactionController(ILogger<TransactionController> logger, HomebudgetContext context)
        {
            _logger = logger;
            _context = context;
        }

        [HttpPost(Name = "CreateTransaction")]
        public ViewTransaction Create(ViewCreateTransaction model)
        {
            if (ModelState.IsValid)
            {
                using (var transaction = _context.Database.BeginTransaction())
                {
                    var result = new Models.Transaction
                    {
                        DatetimeCreated = model.Created,
                        FromAccountId = model.FromId,
                        Description = model.Description,
                        ToAccountId = model.ToId,
                        Identifier = model.Identifier,
                        TransactionLines = model.Lines.Select((line, i) => new Models.TransactionLine
                        {
                            Amount = line.Amount,
                            Description = line.Description,
                            Order = i + 1,
                        }).ToList(),
                    };
                    _context.Transactions.Add(result);
                    transaction.Commit();
                    _context.SaveChanges();
                    return new ViewTransaction {
                        Id = result.Id,
                        Identifier = result.Identifier,
                        Created = result.DatetimeCreated,
                        Description = result.Description,
                        From = result.FromAccount != null
                            ? new ViewAccount
                            {
                                Id = result.FromAccount.Id,
                                Name = result.FromAccount.Name,
                                Description = result.FromAccount.Description,
                            } : null,
                        To = result.ToAccount != null
                            ? new ViewAccount
                            {
                                Id = result.ToAccount.Id,
                                Name = result.ToAccount.Name,
                                Description = result.ToAccount.Description,
                            } : null,
                        Lines = result.TransactionLines
                            .OrderBy(line => line.Order)
                            .Select(line => new ViewTransactionLine
                            {
                                Amount = line.Amount,
                            }).ToList(),
                    };
                }
            }
            throw new Exception();
        }

        [HttpPost()]
        [Route("/[controller]/[action]")]
        public ViewSearchResponse<ViewTransaction> Search(ViewSearch query)
        {
            var result = _context.Transactions
                .ApplySearch(query)
                .Skip(query.From)
                .Take(query.To - query.From)
                .Select(transaction => new ViewTransaction
                {
                    Id = transaction.Id,
                    Created = transaction.DatetimeCreated,
                    Description = transaction.Description,
                    From = transaction.FromAccount != null
                        ? new ViewAccount
                        {
                            Id = transaction.FromAccount.Id,
                            Description = transaction.FromAccount.Description,
                            Name = transaction.FromAccount.Name
                        } : null,
                    To = transaction.ToAccount != null
                        ? new ViewAccount
                        {
                            Id = transaction.ToAccount.Id,
                            Description = transaction.ToAccount.Description,
                            Name = transaction.ToAccount.Name
                        } : null,
                    Identifier = transaction.Identifier,
                    Lines = transaction.TransactionLines
                    .OrderBy(line => line.Order)
                    .Select(line => new ViewTransactionLine
                    {
                        Amount = line.Amount,
                    }).ToList()
                })
                .ToList();

            return new ViewSearchResponse<ViewTransaction>
            {
                Data = result,
                TotalItems = _context.Transactions.ApplySearch(query).Count()
            };
        }

        [HttpPost()]
        [Route("/[controller]/[action]")]
        public List<string> FindDuplicates(List<string> identifiers)
        {
            return _context.Transactions
                .Where(transaction => transaction.Identifier != null && identifiers.Contains(transaction.Identifier))
                .Select(transaction => transaction.Identifier!)
                .ToList();
        }

        [HttpPost()]
        [Route("/[controller]/[action]")]
        public ViewTransactionCreateManyResponse CreateMany(List<ViewCreateTransaction> transactions)
        {
            var failed = new List<ViewCreateTransaction>();
            var duplicate = new List<ViewCreateTransaction>();
            var success = new List<ViewCreateTransaction>();

            foreach (var transaction in transactions)
            {
                if (! string.IsNullOrWhiteSpace(transaction.Identifier) && _context.Transactions.Any(dbTransaction => dbTransaction.Identifier == transaction.Identifier))
                {
                    duplicate.Add(transaction);
                }
                else
                {
                    try
                    {
                        var result = new Models.Transaction
                        {
                            DatetimeCreated = transaction.Created,
                            FromAccountId = transaction.FromId,
                            Description = transaction.Description,
                            ToAccountId = transaction.ToId,
                            Identifier = transaction.Identifier,
                            TransactionLines = transaction.Lines.Select((line, i) => new Models.TransactionLine
                            {
                                Amount = line.Amount,
                                Description = line.Description,
                                Order = i + 1,
                            }).ToList(),
                        };
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

            return new ViewTransactionCreateManyResponse
            {
                Succeeded = success,
                Duplicate = duplicate,
                Failed = failed,
            };
        }
    }
}