using assetgrid_backend.Helpers;
using assetgrid_backend.models.Automation;
using assetgrid_backend.models.MetaFields;
using assetgrid_backend.models.ViewModels;
using assetgrid_backend.models.ViewModels.Automation;
using assetgrid_backend.Models;
using assetgrid_backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace assetgrid_backend.Controllers
{
    [ApiController]
    [Authorize]
    [Route("/api/v1/[controller]")]
    public class MetaController : Controller
    {
        private readonly AssetgridDbContext _context;
        private readonly IUserService _user;
        private readonly IOptions<ApiBehaviorOptions> _apiBehaviorOptions;
        public MetaController(AssetgridDbContext context, IUserService userService, IOptions<ApiBehaviorOptions> apiBehaviorOptions)
        {
            _context = context;
            _user = userService;
            _apiBehaviorOptions = apiBehaviorOptions;
        }

        /// <summary>
        /// Returns a summary of all meta fields available for the current user
        /// </summary>
        [HttpGet("/api/v1/Meta/")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(List<ViewMetaField>))]
        public async Task<IActionResult> List()
        {
            var user = _user.GetCurrent(HttpContext)!;
            var metaFields = await _context.UserMetaFields
                .Where(x => x.UserId == user.Id)
                .Select(x => new ViewMetaField(
                   x.FieldId,
                   x.Field.Name,
                   x.Field.Description,
                   x.Field.Type,
                   x.Field.ValueType,
                   x.Permissions
                 )).ToListAsync();

            return Ok(metaFields);
        }

        /// <summary>
        /// Create a new meta field
        /// </summary>
        /// <param name="model">The meta field to create</param>
        [HttpPost("/api/v1/Meta/")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(ViewMetaField))]
        public async Task<IActionResult> Create(ViewCreateMetaField model)
        {
            if (model.Type != MetaFieldType.Transaction)
            {
                // Currently only transaction fields are supported
                ModelState.AddModelError(nameof(model.Type), "Only transaction meta fields are supported currently");
                return _apiBehaviorOptions.Value?.InvalidModelStateResponseFactory(ControllerContext) ?? BadRequest();
            }

            var user = _user.GetCurrent(HttpContext)!;
            if (ModelState.IsValid)
            {
                using (var transaction = _context.Database.BeginTransaction())
                {
                    var result = new MetaField
                    {
                        Name = model.Name,
                        Description = model.Description,
                        Type = model.Type,
                        ValueType = model.ValueType
                    };
                    var userMetaField = new UserMetaField
                    {
                        Field = result,
                        Permissions = UserMetaField.FieldPermissions.Owner,
                        User = user,
                        UserId = user.Id
                    };
                    _context.MetaFields.Add(result);
                    _context.UserMetaFields.Add(userMetaField);

                    await _context.SaveChangesAsync();
                    transaction.Commit();

                    return Ok(new ViewMetaField(
                        result.Id,
                        result.Name,
                        result.Description,
                        result.Type,
                        result.ValueType,
                        userMetaField.Permissions
                    ));
                }
            }
            return _apiBehaviorOptions.Value?.InvalidModelStateResponseFactory(ControllerContext) ?? BadRequest();
        }

        /// <summary>
        /// Delete a meta field
        /// </summary>
        /// <param name="model">The meta field to delete</param>
        [HttpDelete("/api/v1/Meta/{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> Delete(int id)
        {
            var user = _user.GetCurrent(HttpContext)!;
            if (ModelState.IsValid)
            {
                using (var transaction = _context.Database.BeginTransaction())
                {
                    var result = await _context.UserMetaFields
                        .Include(x => x.Field)
                        .Where(x => x.UserId == user.Id && x.FieldId == id)
                        .SingleOrDefaultAsync();

                    if (result == null)
                    {
                        return NotFound();
                    }

                    if (result.Permissions != UserMetaField.FieldPermissions.Owner)
                    {
                        return Forbid();
                    }

                    _context.UserMetaFields.RemoveRange(_context.UserMetaFields.Where(x => x.FieldId == result.FieldId));
                    _context.MetaFields.Remove(result.Field);

                    await _context.SaveChangesAsync();
                    transaction.Commit();

                    return Ok();
                }
            }
            return _apiBehaviorOptions.Value?.InvalidModelStateResponseFactory(ControllerContext) ?? BadRequest();
        }
    }
}
