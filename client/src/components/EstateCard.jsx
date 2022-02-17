import React, { useState } from 'react'
import { Card, Avatar, Image, Skeleton, Popover, Tag, Dropdown, Menu, Space } from 'antd'
import { CopyOutlined, EditOutlined, EyeOutlined, EyeTwoTone, FontSizeOutlined, HeartOutlined, HeartTwoTone } from '@ant-design/icons'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import { gql, useMutation } from '@apollo/client'
import '../styles.css'

const BASE_IMAGE_URL = process.env.REACT_APP_BASE_IMAGE_URL ?? ''

const ImageGallery = ({immowebCode, images}) => {
    const fullURLs = images.map(i => `${BASE_IMAGE_URL}/${immowebCode}/${i}`)
    const firstURL = fullURLs[0]
    const [visible, setVisible] = useState(false)
    
    return (
    <>
        <Image
            src={firstURL}
            placeholder={<Skeleton.Image style={{width:300, height:200}} />}
            preview={{visible: false}} 
            onClick={() => setVisible(true)}
            style={{height: '200px', objectFit: 'cover', overflow: 'hidden'}}
        />

        <div style={{display: 'none'}}>
            <Image.PreviewGroup preview={{
                visible, onVisibleChange: v => setVisible(v)
            }}>
                {fullURLs.map(image => (
                    <Image src={image} key={image} />
                ))}
            </Image.PreviewGroup>
        </div>
    </>
    )
}

export default function EstateCard({estate}) {
    
    // TODO : display this component somewhere
    /*const PriceHistory = () => estate.priceHistory && (
        <Timeline mode="left">
            {estate.priceHistory.map(h => (
                <Timeline.Item label={moment(h.date).format('DD/MM')}>
                    {h.price}
                </Timeline.Item>
            ))}
        </Timeline>
    )*/

    const PriceInfo = () => {
        if(estate.priceHistory) {
            return  <Space>
                        <span style={{textDecorationLine: 'line-through'}}>
                            {estate.priceHistory[0].price}
                        </span>
                        {estate.displayPrice}
                    </Space>
        } else {
            return estate.displayPrice
        }
    }

    const [markAsLiked] = useMutation(gql`
        mutation markAsLiked($immowebCode: Int!, $isLiked: Boolean) {
            markAsLiked(immowebCode: $immowebCode, isLiked: $isLiked)
        }
    `, {
        variables: {immowebCode: estate.immowebCode},
        // TODO: if the mutation returned the id and the isLiked flag directly, this option wouldn't be needed as cache would be auto updated
        update: (cache, { data }) => {
            cache.modify({
                id: cache.identify(estate),
                fields: {
                    isLiked: () => data.markAsLiked
                }
            })
        }
    })

    const [markAsVisited] = useMutation(gql`
        mutation markAsVisited($immowebCode: Int!, $isVisited: Boolean) {
            markAsVisited(immowebCode: $immowebCode, isVisited: $isVisited)
        }
    `, {
        variables: {immowebCode: estate.immowebCode},
        // TODO: if the mutation returned the id and the isVisited flag directly, this option wouldn't be needed as cache would be auto updated
        update: (cache, { data }) => {
            cache.modify({
                id: cache.identify(estate),
                fields: {
                    isVisited: () => data.markAsVisited
                }
            })
        }
    })

    return (
        <div className='custom EstateCard' >
            <Card hoverable

                title={<PriceInfo/>}
                
                cover={<ImageGallery immowebCode={estate.immowebCode} images={estate.images} />}

                extra={<>
                    {estate.livingArea && <Tag color="default">↔{estate.livingArea}m²</Tag>}
                    {estate.bedroomCount > 0 && <Tag color="geekblue">🛏 {estate.bedroomCount}</Tag>}
                </>}
                actions={[
                    
                    estate.isLiked
                        ? <HeartTwoTone  onClick={() => markAsLiked({variables: {isLiked: false}})} key="heart" twoToneColor="red"  />
                        : <HeartOutlined onClick={() => markAsLiked({variables: {isLiked: true}})}  key="heart"  />,

                    estate.isVisited
                        ? <EyeTwoTone onClick={() => markAsVisited({variables: {isVisited: false}})} key="visited" twoToneColor="purple"  />
                        : <EyeOutlined onClick={() => markAsVisited({variables: {isVisited: true}})}  key="visited"  />,

                    <Popover trigger="hover" content={
                            <div style={{maxWidth: '300px', fontSize: '0.8em', fontStyle: 'italic', color: '#3f6ea7'}}>
                                {estate.description || 'No description available'}
                            </div>} >
                        <FontSizeOutlined key="more" />
                    </Popover>,

                    <Dropdown overlay={
                        <Menu>
                            <Menu.Item key="sold">Mark as sold</Menu.Item>
                            <Menu.Item key="duplicate">Mark as duplicate</Menu.Item>
                            <Menu.Item key="price">Add final price</Menu.Item>
                            <Menu.Item key="edit">Correct field</Menu.Item>
                        </Menu>
                    }>
                        <EditOutlined key="edit" />
                    </Dropdown>,

                    <Popover trigger="hover" content={estate.immowebCode}>
                        <CopyToClipboard text={estate.immowebCode}>
                            <CopyOutlined key="copy" />
                        </CopyToClipboard>
                    </Popover>
                    
                ]}
            >

                <Card.Meta
                    avatar={estate.agencyName ? <Popover content={estate.agencyName}><Avatar src={estate.agencyLogo} /></Popover> : null}
                    title={
                        estate.street 
                            ? <span>{estate.displayStreetAndNumber}<br/><small>{estate.zipCode + ' ' + estate.locality}</small></span>
                            : estate.zipCode + ' ' + estate.locality
                    }
                    description={estate.displayModificationDate}
                />

                <Card.Meta style={{paddingTop: '12px'}}
                    description={
                    <>
                        {estate.hasGarden && <Tag color="lime">✓ 🌳 {estate.gardenArea || '?'}m²</Tag>}
                        {estate.isAuction && <Tag color="orange">$↥ auction</Tag>}
                        {estate.isSold && <Tag color="red">😠 sold</Tag>}
                        {estate.isUnderOption && <Tag color="red">😤 option</Tag>}
                    </>}    
                />

            </Card>
        </div>
    )
}
