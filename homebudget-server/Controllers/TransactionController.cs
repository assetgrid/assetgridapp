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
                    return result.ToView();
                }
            }
            throw new Exception();
        }

        [HttpGet(Name = "List")]
        public List<ViewTransaction> List()
        {
            return _context.Transactions
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
    }
}