import React, { useState } from 'react'
import { List, Card, Avatar, Pagination, Image, Skeleton, Popover, Tag, Dropdown, Menu } from 'antd'
import { CopyOutlined, EditOutlined, ExpandAltOutlined, HeartOutlined } from '@ant-design/icons'
import { CopyToClipboard } from 'react-copy-to-clipboard'

const ImageGallery = ({immowebCode, images}) => {
    const fullURLs = images.map(i => `http://localhost:5000/${immowebCode}/${i}`)
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

    return (
        <div className='EstateCard' >
            <Card title={estate.displayPrice} hoverable
                cover={<ImageGallery immowebCode={estate.immowebCode} images={estate.images} />}
                extra={estate.hasGarden ? (<Tag color="lime">✓ 🌳 {estate.gardenArea || '?'}m²</Tag>) : null}
                actions={[
                    <HeartOutlined key="heart" />,
                    <ExpandAltOutlined key="expand" />,

                    <Dropdown overlay={
                        <Menu>
                            <Menu.Item>Mark as sold</Menu.Item>
                            <Menu.Item>Mark as duplicate</Menu.Item>
                            <Menu.Item>Add final price</Menu.Item>
                            <Menu.Item>Correct field</Menu.Item>
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
                    title={estate.locality}
                    description={estate.displayModificationDate}
                />
            </Card>
        </div>
    )
}
