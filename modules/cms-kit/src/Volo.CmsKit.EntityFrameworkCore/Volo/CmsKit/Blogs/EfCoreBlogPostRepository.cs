﻿using JetBrains.Annotations;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Dynamic.Core;
using System.Threading;
using System.Threading.Tasks;
using Volo.Abp;
using Volo.Abp.Domain.Entities;
using Volo.Abp.Domain.Repositories.EntityFrameworkCore;
using Volo.Abp.EntityFrameworkCore;
using Volo.CmsKit.EntityFrameworkCore;
using Volo.CmsKit.MarkedItems;
using Volo.CmsKit.Tags;
using Volo.CmsKit.Users;

namespace Volo.CmsKit.Blogs;

public class EfCoreBlogPostRepository : EfCoreRepository<ICmsKitDbContext, BlogPost, Guid>, IBlogPostRepository
{
    private readonly MarkedItemManager _markedItemManager;
    private EntityTagManager _entityTagManager;

    public EfCoreBlogPostRepository(
        IDbContextProvider<ICmsKitDbContext> dbContextProvider,
        MarkedItemManager markedItemManager,
        EntityTagManager entityTagManager) : base(dbContextProvider)
    {
        _markedItemManager = markedItemManager;
        _entityTagManager = entityTagManager;
    }

    public virtual async Task<BlogPost> GetBySlugAsync(
        Guid blogId,
        [NotNull] string slug,
        CancellationToken cancellationToken = default)
    {
        Check.NotNullOrEmpty(slug, nameof(slug));

        var blogPost = await GetAsync(
                                x => x.BlogId == blogId && x.Slug.ToLower() == slug,
                                cancellationToken: GetCancellationToken(cancellationToken));

        blogPost.Author = await (await GetDbContextAsync())
                            .Set<CmsUser>()
                            .FirstOrDefaultAsync(x => x.Id == blogPost.AuthorId, GetCancellationToken(cancellationToken));

        return blogPost;
    }

    public virtual async Task<int> GetCountAsync(
        string filter = null,
        Guid? blogId = null,
        Guid? authorId = null,
        Guid? tagId = null,
        Guid? favoriteUserId = null,
        BlogPostStatus? statusFilter = null,
        CancellationToken cancellationToken = default)
    {
        var tagFilteredEntityIds = tagId.HasValue
                ? await _entityTagManager.GetEntityIdsFilteredByTagAsync(tagId.Value, CurrentTenant.Id, cancellationToken)
                : null;

        var favoriteUserFilteredEntityIds = favoriteUserId.HasValue
            ? await _markedItemManager.GetEntityIdsFilteredByUserAsync(favoriteUserId.Value, BlogPostConsts.EntityType)
            : null;

        var queryable = (await GetDbSetAsync())
            .WhereIf(tagFilteredEntityIds != null, x => tagFilteredEntityIds.Contains(x.Id.ToString()))
            .WhereIf(favoriteUserFilteredEntityIds != null, x => favoriteUserFilteredEntityIds.Contains(x.Id.ToString()))
            .WhereIf(blogId.HasValue, x => x.BlogId == blogId)
            .WhereIf(authorId.HasValue, x => x.AuthorId == authorId)
            .WhereIf(statusFilter.HasValue, x => x.Status == statusFilter)
            .WhereIf(!string.IsNullOrEmpty(filter), x => x.Title.Contains(filter) || x.Slug.Contains(filter));

        var count = await queryable.CountAsync(GetCancellationToken(cancellationToken));
        return count;
    }

    public virtual async Task<List<BlogPost>> GetListAsync(
        string filter = null,
        Guid? blogId = null,
        Guid? authorId = null,
        Guid? tagId = null,
        Guid? favoriteUserId = null,
        BlogPostStatus? statusFilter = null,
        int maxResultCount = int.MaxValue,
        int skipCount = 0,
        string sorting = null,
        CancellationToken cancellationToken = default)

    {
        var dbContext = await GetDbContextAsync();
        var blogPostsDbSet = dbContext.Set<BlogPost>();
        var usersDbSet = dbContext.Set<CmsUser>();

        var tagFilteredEntityIds = tagId.HasValue
                ? await _entityTagManager.GetEntityIdsFilteredByTagAsync(tagId.Value, CurrentTenant.Id, cancellationToken)
                : null;

        var favoriteUserFilteredEntityIds = favoriteUserId.HasValue
            ? await _markedItemManager.GetEntityIdsFilteredByUserAsync(favoriteUserId.Value, BlogPostConsts.EntityType)
            : null;

        var queryable = (await GetDbSetAsync())
            .WhereIf(tagFilteredEntityIds != null, x => tagFilteredEntityIds.Contains(x.Id.ToString()))
            .WhereIf(favoriteUserFilteredEntityIds != null, x => favoriteUserFilteredEntityIds.Contains(x.Id.ToString()))
            .WhereIf(blogId.HasValue, x => x.BlogId == blogId)
            .WhereIf(!string.IsNullOrWhiteSpace(filter), x => x.Title.Contains(filter) || x.Slug.Contains(filter))
            .WhereIf(authorId.HasValue, x => x.AuthorId == authorId)
            .WhereIf(statusFilter.HasValue, x => x.Status == statusFilter);

        queryable = queryable.OrderBy(sorting.IsNullOrEmpty() ? $"{nameof(BlogPost.CreationTime)} desc" : sorting);

        var combinedResult = await queryable
            .Join(
                usersDbSet,
                o => o.AuthorId,
                i => i.Id,
                (blogPost, user) => new { blogPost, user })
            .Skip(skipCount)
            .Take(maxResultCount)
            .ToListAsync(GetCancellationToken(cancellationToken));

        return combinedResult.Select(s =>
        {
            s.blogPost.Author = s.user;
            return s.blogPost;
        }).ToList();
    }

    public virtual async Task<bool> SlugExistsAsync(Guid blogId, [NotNull] string slug,
        CancellationToken cancellationToken = default)
    {
        Check.NotNullOrEmpty(slug, nameof(slug));

        return await (await GetDbSetAsync()).AnyAsync(x => x.BlogId == blogId && x.Slug.ToLower() == slug,
            GetCancellationToken(cancellationToken));
    }

    public virtual async Task<List<CmsUser>> GetAuthorsHasBlogPostsAsync(int skipCount, int maxResultCount, string sorting, string filter, CancellationToken cancellationToken = default)
    {
        return await (await CreateAuthorsQueryableAsync())
            .Skip(skipCount)
            .Take(maxResultCount)
            .WhereIf(!filter.IsNullOrEmpty(), x => x.UserName.Contains(filter.ToLower()))
            .OrderBy(sorting.IsNullOrEmpty() ? nameof(CmsUser.UserName) : sorting)
            .ToListAsync(GetCancellationToken(cancellationToken));
    }

    public virtual async Task<int> GetAuthorsHasBlogPostsCountAsync(string filter, CancellationToken cancellationToken = default)
    {
        return await (await CreateAuthorsQueryableAsync())
            .WhereIf(!filter.IsNullOrEmpty(), x => x.UserName.Contains(filter.ToLower()))
            .CountAsync(GetCancellationToken(cancellationToken));
    }

    public virtual async Task<CmsUser> GetAuthorHasBlogPostAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await (await CreateAuthorsQueryableAsync()).FirstOrDefaultAsync(x => x.Id == id, GetCancellationToken(cancellationToken))
            ?? throw new EntityNotFoundException(typeof(CmsUser), id);
    }

    private async Task<IQueryable<CmsUser>> CreateAuthorsQueryableAsync()
    {
        return (await GetDbContextAsync()).BlogPosts.Select(x => x.Author).Distinct();
    }
    
    public virtual async Task<bool> HasBlogPostWaitingForReviewAsync(CancellationToken cancellationToken = default)
    {
        return await (await GetDbSetAsync())
            .AnyAsync(x => x.Status == BlogPostStatus.WaitingForReview, GetCancellationToken(cancellationToken));
    }
    
    public async Task UpdateBlogAsync(Guid sourceBlogId, Guid? targetBlogId = null, CancellationToken cancellationToken = default)
    {
        if (targetBlogId != null)
        {
            await (await GetDbSetAsync()).Where(x => x.BlogId == sourceBlogId).ExecuteUpdateAsync(x => x.SetProperty(b => b.BlogId, targetBlogId.Value), GetCancellationToken(cancellationToken));
            
        }
        else
        {
            await (await GetDbSetAsync()).Where(x => x.BlogId == sourceBlogId).ExecuteDeleteAsync(GetCancellationToken(cancellationToken));
        }
    }
}