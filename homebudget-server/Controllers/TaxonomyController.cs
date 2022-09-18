using homebudget_server.Data;
using homebudget_server.Models;
using homebudget_server.Models.ViewModels;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace homebudget_server.Controllers
{
    [ApiController]
    [EnableCors("AllowAll")]
    public class TaxonomyController : Controller
    {
        private readonly HomebudgetContext _context;
        public TaxonomyController(HomebudgetContext context)
        {
            _context = context;
        }

        [HttpGet]
        [Route("/[controller]/[action]/{prefix}")]
        public string[] CategoryAutocomplete(string prefix)
        {
            return _context.Categories
                .Where(category => category.NormalizedName.Contains(Category.Normalize(prefix)))
                .Select(category => category.Name)
                .ToArray();
        }
    }
}
