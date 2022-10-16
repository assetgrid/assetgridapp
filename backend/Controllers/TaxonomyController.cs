using assetgrid_backend.Data;
using assetgrid_backend.Models;
using assetgrid_backend.Models.ViewModels;
using assetgrid_backend.Helpers;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using assetgrid_backend.Services;
using Microsoft.EntityFrameworkCore;

namespace assetgrid_backend.Controllers
{
    [ApiController]
    [Authorize]
    public class TaxonomyController : Controller
    {
        private readonly AssetgridDbContext _context;
        private readonly IUserService _user;
        public TaxonomyController(AssetgridDbContext context, IUserService userService)
        {
            _context = context;
            _user = userService;
        }

        [HttpGet]
        [Route("/api/v1/[controller]/[action]/{prefix}")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(List<string>))]
        public async Task<IActionResult> CategoryAutocomplete(string prefix)
        {
            var user = _user.GetCurrent(HttpContext)!;
            var normalizedPrefix = prefix.ToLower();
            return Ok(await _context.TransactionLines
                .Where(line => line.Transaction.SourceAccount!.Users!.Any(u => u.UserId == user.Id) || line.Transaction.DestinationAccount!.Users!.Any(u => u.UserId == user.Id))
                .Where(line => line.Category.ToLower().Contains(normalizedPrefix))
                .Select(line => line.Category)
                .Distinct()
                .ToListAsync());
        }
    }
}
