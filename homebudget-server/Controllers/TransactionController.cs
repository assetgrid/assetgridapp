using homebudget_server.Data;
using homebudget_server.Models;
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
            if (string.IsNullOrWhiteSpace(model.Identifier))
            {
                model.Identifier = null;
            }

            if (ModelState.IsValid)
            {
                using (var transaction = _context.Database.BeginTransaction())
                {
                    var result = new Models.Transaction
                    {
                        DateTime = model.DateTime,
                        SourceAccountId = model.SourceId,
                        Description = model.Description,
                        DestinationAccountId = model.DestinationId,
                        Identifier = model.Identifier,
                        Total = model.Lines.Select(line => line.Amount).Sum(),
                        TransactionLines = model.Lines.Select((line, i) => new Models.TransactionLine
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
                    transaction.Commit();
                    _context.SaveChanges();
                    return new ViewTransaction {
                        Id = result.Id,
                        Identifier = result.Identifier,
                        DateTime = result.DateTime,
                        Description = result.Description,
                        Source = result.SourceAccount != null
                            ? new ViewAccount
                            {
                                Id = result.SourceAccount.Id,
                                Name = result.SourceAccount.Name,
                                Description = result.SourceAccount.Description,
                            } : null,
                        Destination = result.DestinationAccount != null
                            ? new ViewAccount
                            {
                                Id = result.DestinationAccount.Id,
                                Name = result.DestinationAccount.Name,
                                Description = result.DestinationAccount.Description,
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
                .SelectView()
                .ToList();

            return new ViewSearchResponse<ViewTransaction>
            {
                Data = result,
                TotalItems = _context.Transactions.ApplySearch(query).Count(),
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
                            DateTime = transaction.DateTime,
                            SourceAccountId = transaction.SourceId,
                            Description = transaction.Description,
                            DestinationAccountId = transaction.DestinationId,
                            Identifier = transaction.Identifier,
                            Total = transaction.Lines.Select(line => line.Amount).Sum(),
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

            return new ViewTransactionCreateManyResponse
            {
                Succeeded = success,
                Duplicate = duplicate,
                Failed = failed,
            };
        }
    }
}